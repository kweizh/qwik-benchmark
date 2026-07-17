import { component$, useSignal } from "@builder.io/qwik";
import {
  routeLoader$,
  routeAction$,
  zod$,
  z,
  Form,
  type DocumentHead,
} from "@builder.io/qwik-city";
import {
  getAllComments,
  buildTree,
  addComment,
  type CommentNode,
} from "../db.server";

// Loader to fetch and build the comment tree on the server
export const useCommentsLoader = routeLoader$(async () => {
  const rows = getAllComments();
  const tree = buildTree(rows);
  return tree;
});

// Action to add a comment or reply
export const useAddCommentAction = routeAction$(
  async (data) => {
    const parentId =
      data.parent_id !== undefined && data.parent_id !== null
        ? Number(data.parent_id)
        : null;
    const author = data.author.trim();
    const body = data.body.trim();

    const newComment = addComment(parentId, author, body);
    return { success: true, comment: newComment };
  },
  zod$({
    parent_id: z.preprocess((val) => {
      if (val === "" || val === undefined || val === null) return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    }, z.number().nullable().optional()),
    author: z
      .string()
      .trim()
      .min(1, { message: "Author is required and cannot be empty" }),
    body: z
      .string()
      .trim()
      .min(1, { message: "Body is required and cannot be empty" }),
  }),
);

interface CommentProps {
  comment: CommentNode;
  depth: number;
  action: any;
}

// Recursive Qwik component to render a single comment and its descendants
export const CommentComponent = component$<CommentProps>(
  ({ comment, depth, action }) => {
    const isCollapsed = useSignal(false);
    const showReplyForm = useSignal(false);

    // Determine if this reply form has validation errors
    const isCurrentForm =
      Number(action.formData?.get("parent_id")) === comment.id;
    const hasErrors = isCurrentForm && action.value?.failed;
    const fieldErrors = hasErrors ? action.value?.fieldErrors : null;

    return (
      <div
        data-comment-id={String(comment.id)}
        data-depth={String(depth)}
        class="comment-node"
      >
        <div class="comment-content">
          <div class="comment-header">
            <strong class="comment-author">{comment.author}</strong>
            <span class="comment-date">
              {new Date(comment.created_at).toLocaleString()}
            </span>
          </div>
          <div class="comment-body">{comment.body}</div>
          <div class="comment-footer">
            <span
              data-reply-count={String(comment.descendantCount)}
              class="reply-count"
            >
              {comment.descendantCount}{" "}
              {comment.descendantCount === 1 ? "reply" : "replies"}
            </span>

            {comment.descendantCount > 0 && (
              <button
                type="button"
                data-testid={`toggle-${comment.id}`}
                onClick$={() => {
                  isCollapsed.value = !isCollapsed.value;
                }}
                class="toggle-btn"
              >
                {isCollapsed.value ? "Expand" : "Collapse"}
              </button>
            )}

            <button
              type="button"
              onClick$={() => {
                showReplyForm.value = !showReplyForm.value;
              }}
              class="reply-toggle-btn"
            >
              {showReplyForm.value ? "Cancel" : "Reply"}
            </button>
          </div>
        </div>

        {/* Reply Form */}
        {(showReplyForm.value || hasErrors) && (
          <Form
            action={action}
            class="reply-form"
            onSubmitCompleted$={(event) => {
              if (event.detail && event.detail.status < 400) {
                showReplyForm.value = false;
                (event.target as HTMLFormElement).reset();
              }
            }}
          >
            <input type="hidden" name="parent_id" value={String(comment.id)} />
            <div class="form-group">
              <label>
                Author:
                <input
                  type="text"
                  name="author"
                  placeholder="Your name"
                  class={fieldErrors?.author ? "input-error" : ""}
                  defaultValue={
                    hasErrors ? (action.formData?.get("author") as string) : ""
                  }
                />
              </label>
              {fieldErrors?.author && (
                <span class="error-msg">{fieldErrors.author[0]}</span>
              )}
            </div>
            <div class="form-group">
              <label>
                Comment:
                <textarea
                  name="body"
                  placeholder="Write a reply..."
                  class={fieldErrors?.body ? "input-error" : ""}
                  defaultValue={
                    hasErrors ? (action.formData?.get("body") as string) : ""
                  }
                />
              </label>
              {fieldErrors?.body && (
                <span class="error-msg">{fieldErrors.body[0]}</span>
              )}
            </div>
            <button type="submit" class="submit-btn">
              Submit Reply
            </button>
          </Form>
        )}

        {/* Nested Replies */}
        {!isCollapsed.value && comment.replies.length > 0 && (
          <div class="comment-replies">
            {comment.replies.map((reply) => (
              <CommentComponent
                key={reply.id}
                comment={reply}
                depth={depth + 1}
                action={action}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);

export default component$(() => {
  const comments = useCommentsLoader();
  const action = useAddCommentAction();

  // Determine if top-level form has validation errors
  const isTopLevelForm = !action.formData?.get("parent_id");
  const hasTopLevelErrors = isTopLevelForm && action.value?.failed;
  const topLevelFieldErrors = hasTopLevelErrors
    ? action.value?.fieldErrors
    : null;

  return (
    <main>
      <h1>Nested Comment Threads</h1>

      {/* Comment Tree */}
      <div class="comment-tree">
        {comments.value.length === 0 ? (
          <p>No comments yet. Be the first to comment!</p>
        ) : (
          comments.value.map((comment) => (
            <CommentComponent
              key={comment.id}
              comment={comment}
              depth={0}
              action={action}
            />
          ))
        )}
      </div>

      {/* Top-level Form */}
      <div class="top-level-container">
        <Form
          action={action}
          class="top-level-form"
          onSubmitCompleted$={(event) => {
            if (event.detail && event.detail.status < 400) {
              (event.target as HTMLFormElement).reset();
            }
          }}
        >
          <h2>Add a new top-level comment</h2>
          <div class="form-group">
            <label>
              Author:
              <input
                type="text"
                name="author"
                placeholder="Your name"
                class={topLevelFieldErrors?.author ? "input-error" : ""}
                defaultValue={
                  hasTopLevelErrors
                    ? (action.formData?.get("author") as string)
                    : ""
                }
              />
            </label>
            {topLevelFieldErrors?.author && (
              <span class="error-msg">{topLevelFieldErrors.author[0]}</span>
            )}
          </div>
          <div class="form-group">
            <label>
              Comment:
              <textarea
                name="body"
                placeholder="Write a comment..."
                class={topLevelFieldErrors?.body ? "input-error" : ""}
                defaultValue={
                  hasTopLevelErrors
                    ? (action.formData?.get("body") as string)
                    : ""
                }
              />
            </label>
            {topLevelFieldErrors?.body && (
              <span class="error-msg">{topLevelFieldErrors.body[0]}</span>
            )}
          </div>
          <button type="submit" class="submit-btn">
            Add Comment
          </button>
        </Form>
      </div>
    </main>
  );
});

export const head: DocumentHead = {
  title: "Nested Comment Threads",
  meta: [
    {
      name: "description",
      content: "Nested comment thread system using Qwik City and SQLite",
    },
  ],
};
