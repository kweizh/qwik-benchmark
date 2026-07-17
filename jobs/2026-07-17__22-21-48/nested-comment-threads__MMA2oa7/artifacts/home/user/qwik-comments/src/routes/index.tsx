import { component$ } from "@builder.io/qwik";
import {
  Form,
  routeAction$,
  routeLoader$,
  zod$,
  z,
} from "@builder.io/qwik-city";
import type { CommentRow } from "../db";
import { CommentNode } from "../components/comment-node";

// ---- Tree types ----
export interface TreeNode extends CommentRow {
  children: TreeNode[];
  replyCount: number; // total nested descendants
}

// ---- Build a nested tree (with total descendant counts) from a flat list ----
function buildTree(rows: CommentRow[]): TreeNode[] {
  const nodes = new Map<number, TreeNode>();
  for (const r of rows) {
    nodes.set(r.id, { ...r, children: [], replyCount: 0 });
  }

  const roots: TreeNode[] = [];
  for (const node of nodes.values()) {
    if (node.parent_id == null) {
      roots.push(node);
    } else {
      const parent = nodes.get(node.parent_id);
      if (parent) {
        parent.children.push(node);
      } else {
        // orphan (parent missing) -> treat as root
        roots.push(node);
      }
    }
  }

  // Compute total descendant counts bottom-up.
  const countDescendants = (n: TreeNode): number => {
    let total = 0;
    for (const c of n.children) {
      total += 1 + countDescendants(c);
    }
    n.replyCount = total;
    return total;
  };
  for (const root of roots) {
    countDescendants(root);
  }

  // Sort children by id for stable ordering.
  const sortRecursive = (n: TreeNode) => {
    n.children.sort((a, b) => a.id - b.id);
    for (const c of n.children) sortRecursive(c);
  };
  for (const root of roots) sortRecursive(root);
  roots.sort((a, b) => a.id - b.id);

  return roots;
}

// ---- Loader: load all comments on the server and build the tree ----
export const useCommentsTree = routeLoader$(async () => {
  const { getAllComments } = await import("../db");
  const rows = getAllComments();
  return buildTree(rows);
});

// ---- Action: add a reply (or top-level comment) ----
export const useAddComment = routeAction$(
  async (data, { fail }) => {
    const { addComment } = await import("../db");
    const author = (data.author ?? "").toString().trim();
    const body = (data.body ?? "").toString().trim();
    if (!author || !body) {
      return fail(400, {
        error: "Author and body are both required.",
        author: data.author ?? "",
        body: data.body ?? "",
      });
    }

    const rawParent = data.parent_id;
    const parentId =
      rawParent == null || rawParent === "" || rawParent === "null"
        ? null
        : Number(rawParent);

    if (parentId != null && (!Number.isInteger(parentId) || parentId <= 0)) {
      return fail(400, {
        error: "Invalid parent comment.",
        author: data.author ?? "",
        body: data.body ?? "",
      });
    }

    addComment(parentId, author, body);
    return { success: true };
  },
  zod$({
    author: z.string(),
    body: z.string(),
    parent_id: z.string().optional(),
  })
);

export default component$(() => {
  const tree = useCommentsTree();
  const action = useAddComment();

  return (
    <div class="app">
      <h1>Threaded Comments</h1>

      <div class="top-form">
        <h2>Add a comment</h2>
        <Form action={action}>
          <input type="hidden" name="parent_id" value="" />
          <div>
            <input
              type="text"
              name="author"
              placeholder="Your name"
              value={action.value?.failed ? (action.value.author as string) : ""}
            />
          </div>
          <div>
            <textarea name="body" placeholder="What's on your mind?"></textarea>
          </div>
          <button type="submit">Post comment</button>
          {action.value?.failed && (
            <div class="error">{action.value.error}</div>
          )}
        </Form>
      </div>

      <div class="thread">
        {tree.value.map((node) => (
          <CommentNode key={node.id} node={node} depth={0} action={action} />
        ))}
      </div>
    </div>
  );
});