import { component$, useSignal } from "@builder.io/qwik";
import type { ActionStore } from "@builder.io/qwik-city";
import type { CommentNode } from "~/lib/db";
import {
  ReplyForm,
  type AddCommentActionInput,
  type AddCommentActionOutput,
} from "~/components/reply-form/reply-form";

interface CommentProps {
  comment: CommentNode;
  depth: number;
  action: ActionStore<AddCommentActionOutput, AddCommentActionInput>;
}

export const Comment = component$<CommentProps>(({ comment, depth, action }) => {
  const collapsed = useSignal(false);
  const hasReplies = comment.children.length > 0;

  return (
    <li
      class="comment"
      data-comment-id={comment.id}
      data-depth={depth}
    >
      <div class="comment-card">
        <div class="comment-header">
          <span class="comment-author">{comment.author}</span>
          <span class="comment-reply-count" data-reply-count={comment.replyCount}>
            {comment.replyCount} {comment.replyCount === 1 ? "reply" : "replies"}
          </span>
        </div>

        <p class="comment-body">{comment.body}</p>

        <div class="comment-actions">
          {hasReplies && (
            <button
              type="button"
              class="toggle-button"
              data-testid={`toggle-${comment.id}`}
              onClick$={() => (collapsed.value = !collapsed.value)}
            >
              {collapsed.value
                ? `Expand (${comment.children.length})`
                : `Collapse (${comment.children.length})`}
            </button>
          )}
        </div>

        <details class="reply-details">
          <summary>Reply</summary>
          <ReplyForm parentId={comment.id} action={action} label="Reply" />
        </details>
      </div>

      {hasReplies && (
        <ul
          class="comment-children"
          data-testid={`children-${comment.id}`}
          style={{ display: collapsed.value ? "none" : undefined }}
        >
          {comment.children.map((child) => (
            <Comment key={child.id} comment={child} depth={depth + 1} action={action} />
          ))}
        </ul>
      )}
    </li>
  );
});
