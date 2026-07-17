import { component$, useSignal } from "@builder.io/qwik";
import type { CommentNode } from "~/lib/db";
import { CommentForm } from "./comment-form";

interface CommentItemProps {
  comment: CommentNode;
  postId: string;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString();
}

/**
 * Recursively renders a single comment along with all of its nested
 * replies, indenting each level so the thread structure is visible.
 */
export const CommentItem = component$<CommentItemProps>(({ comment, postId }) => {
  const showReplyForm = useSignal(false);

  return (
    <li class="comment" data-comment-id={comment.id}>
      <div class="comment-body">
        <div class="comment-meta">
          <strong class="comment-author">{comment.author}</strong>
          <span class="comment-date">{formatDate(comment.createdAt)}</span>
        </div>
        <p class="comment-text">{comment.text}</p>
        <button
          type="button"
          class="reply-toggle"
          onClick$={() => (showReplyForm.value = !showReplyForm.value)}
        >
          {showReplyForm.value ? "Cancel" : "Reply"}
        </button>

        {showReplyForm.value && (
          <div class="reply-form">
            <CommentForm
              postId={postId}
              parentId={comment.id}
              onSubmitted$={() => (showReplyForm.value = false)}
            />
          </div>
        )}
      </div>

      {comment.replies.length > 0 && (
        <ul class="comment-thread comment-replies">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} postId={postId} />
          ))}
        </ul>
      )}
    </li>
  );
});
