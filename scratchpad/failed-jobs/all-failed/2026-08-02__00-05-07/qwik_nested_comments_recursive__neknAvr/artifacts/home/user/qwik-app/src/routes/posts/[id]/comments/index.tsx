import { component$ } from "@builder.io/qwik";
import {
  routeLoader$,
  useLocation,
  type DocumentHead,
  type RequestHandler,
} from "@builder.io/qwik-city";
import { getCommentById, getCommentTree, insertComment } from "~/lib/db";
import { CommentForm } from "~/components/comments/comment-form";
import { CommentItem } from "~/components/comments/comment-item";

/**
 * GET /posts/:id/comments
 *
 * Content negotiation:
 * - `Accept: application/json` -> 200 OK with the nested comment tree as JSON.
 * - otherwise -> falls through and lets the page component render the HTML UI.
 */
export const onGet: RequestHandler = async (requestEvent) => {
  const accept = requestEvent.request.headers.get("Accept") ?? "";
  if (accept.includes("application/json")) {
    const postId = requestEvent.params.id;
    const tree = getCommentTree(postId);
    requestEvent.json(200, tree);
    return;
  }
  // Not a JSON request: let qwik-city continue to the routeLoader$ + component render below.
};

/**
 * POST /posts/:id/comments
 *
 * Body: { parentId?: number | null, text: string, author: string }
 * Creates a new top-level comment (parentId omitted/null) or a reply
 * (parentId set to an existing comment's id for the same post).
 */
export const onPost: RequestHandler = async (requestEvent) => {
  const postId = requestEvent.params.id;

  let body: unknown;
  try {
    body = await requestEvent.request.json();
  } catch {
    requestEvent.json(400, { error: "Request body must be valid JSON." });
    return;
  }

  if (typeof body !== "object" || body === null) {
    requestEvent.json(400, { error: "Request body must be a JSON object." });
    return;
  }

  const { parentId, text, author } = body as {
    parentId?: unknown;
    text?: unknown;
    author?: unknown;
  };

  if (typeof text !== "string" || text.trim() === "") {
    requestEvent.json(400, { error: "'text' is required and must be a non-empty string." });
    return;
  }

  if (typeof author !== "string" || author.trim() === "") {
    requestEvent.json(400, { error: "'author' is required and must be a non-empty string." });
    return;
  }

  let normalizedParentId: number | null = null;
  if (parentId !== undefined && parentId !== null) {
    const parsed = typeof parentId === "number" ? parentId : Number(parentId);
    if (!Number.isInteger(parsed)) {
      requestEvent.json(400, { error: "'parentId' must be an integer." });
      return;
    }

    const parent = getCommentById(parsed);
    if (!parent) {
      requestEvent.json(404, { error: `Parent comment with id ${parsed} was not found.` });
      return;
    }
    if (parent.postId !== postId) {
      requestEvent.json(400, {
        error: `Parent comment with id ${parsed} does not belong to post '${postId}'.`,
      });
      return;
    }

    normalizedParentId = parsed;
  }

  const created = insertComment(postId, normalizedParentId, text, author);
  requestEvent.json(201, created);
};

export const useCommentTree = routeLoader$(({ params }) => {
  return getCommentTree(params.id);
});

export default component$(() => {
  const tree = useCommentTree();
  const loc = useLocation();
  const postId = loc.params.id;

  return (
    <div class="comments-page">
      <h1>Comments</h1>
      <p class="post-id">
        Post: <code>{postId}</code>
      </p>

      <section class="new-comment">
        <h2>Add a comment</h2>
        <CommentForm postId={postId} parentId={null} />
      </section>

      <section class="comment-list">
        {tree.value.length === 0 ? (
          <p class="no-comments">No comments yet. Be the first to comment!</p>
        ) : (
          <ul class="comment-thread">
            {tree.value.map((comment) => (
              <CommentItem key={comment.id} comment={comment} postId={postId} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Post Comments",
  meta: [
    {
      name: "description",
      content: "Nested comment thread for a blog post.",
    },
  ],
};
