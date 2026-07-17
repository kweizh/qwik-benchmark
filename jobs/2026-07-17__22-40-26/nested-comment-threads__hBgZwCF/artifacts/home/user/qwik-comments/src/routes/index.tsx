import { component$ } from "@builder.io/qwik";
import {
  routeLoader$,
  routeAction$,
  Form,
  zod$,
  z,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { Comment } from "../components/comment";
import {
  getCommentTree,
  getReplyCounts,
  insertComment,
  type CommentNode,
} from "../lib/db";

interface FlatComment {
  id: number;
  parentId: number | null;
  author: string;
  body: string;
  createdAt: string;
  depth: number;
  replyCount: number;
}

interface PageData {
  flat: FlatComment[];
}

export const useCommentsLoader = routeLoader$(async () => {
  const tree = getCommentTree();
  const counts = getReplyCounts();

  const flat: FlatComment[] = [];

  const walk = (node: CommentNode, depth: number) => {
    flat.push({
      id: node.id,
      parentId: node.parentId,
      author: node.author,
      body: node.body,
      createdAt: node.createdAt,
      depth,
      replyCount: counts.get(node.id) ?? 0,
    });
    for (const child of node.children) {
      walk(child, depth + 1);
    }
  };

  for (const root of tree) {
    walk(root, 0);
  }

  return { flat } satisfies PageData;
});

export const useReplyAction = routeAction$(
  async (data, { fail }) => {
    if (!data.author.trim() || !data.body.trim()) {
      return fail(400, {
        message: "Author and body are required",
        fieldErrors: {
          author: !data.author.trim() ? ["Author is required"] : [],
          body: !data.body.trim() ? ["Body is required"] : [],
        },
      });
    }
    insertComment({
      parentId: data.parentId ?? null,
      author: data.author.trim(),
      body: data.body.trim(),
    });
    return { success: true };
  },
  zod$({
    author: z.string().min(1, "Author is required").max(100),
    body: z.string().min(1, "Body is required").max(10000),
    parentId: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => {
        if (v === undefined || v === null || v === "") return null;
        const n = typeof v === "string" ? Number(v) : v;
        if (!Number.isFinite(n)) return null;
        return n as number;
      }),
  })
);

export const useRootCommentAction = routeAction$(
  async (data, { fail }) => {
    if (!data.author.trim() || !data.body.trim()) {
      return fail(400, {
        message: "Author and body are required",
        fieldErrors: {
          author: !data.author.trim() ? ["Author is required"] : [],
          body: !data.body.trim() ? ["Body is required"] : [],
        },
      });
    }
    insertComment({
      parentId: null,
      author: data.author.trim(),
      body: data.body.trim(),
    });
    return { success: true };
  },
  zod$({
    author: z.string().min(1, "Author is required").max(100),
    body: z.string().min(1, "Body is required").max(10000),
  })
);

export default component$(() => {
  const data = useCommentsLoader();
  const replyAction = useReplyAction();
  const rootAction = useRootCommentAction();

  // Build the tree from the flat array.
  type Renderable = FlatComment & { children: Renderable[] };
  const byId = new Map<number, Renderable>();
  for (const c of data.value.flat) {
    byId.set(c.id, { ...c, children: [] });
  }
  const roots: Renderable[] = [];
  for (const c of data.value.flat) {
    const node = byId.get(c.id)!;
    if (c.parentId !== null && byId.has(c.parentId)) {
      byId.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Convert Renderable tree to CommentNode tree (preserves full children).
  const toCommentNode = (n: Renderable): CommentNode => ({
    id: n.id,
    parentId: n.parentId,
    author: n.author,
    body: n.body,
    createdAt: n.createdAt,
    children: n.children.map(toCommentNode),
  });

  return (
    <div>
      <h1>Nested Comments</h1>

      <Form action={rootAction} class="root-form">
        <h2>Add a new top-level comment</h2>
        <input type="text" name="author" placeholder="Author" />
        <textarea name="body" placeholder="Share your thoughts..." rows={3}></textarea>
        {rootAction.value?.failed && rootAction.value.fieldErrors && (
          <div class="error">
            {Object.values(rootAction.value.fieldErrors)
              .flat()
              .filter(Boolean)
              .join(" ")}
          </div>
        )}
        <button type="submit">Post comment</button>
      </Form>

      <h2>Thread</h2>
      {roots.length === 0 && <p>No comments yet.</p>}
      <div class="thread">
        {roots.map((n) => (
          <Comment
            key={n.id}
            node={toCommentNode(n)}
            depth={n.depth}
            replyCount={n.replyCount}
            replyAction={replyAction}
          />
        ))}
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Qwik Nested Comments",
};