import { component$, $, useSignal } from "@builder.io/qwik";
import { Form, type ActionStore } from "@builder.io/qwik-city";
import type { CommentTree } from "../../lib/db";

interface AddCommentAction {
  submit: (data: {
    text: string;
    author: string;
    parentId?: string;
  }) => Promise<any>;
  value?: {
    success?: boolean;
    error?: string;
    comment?: any;
  };
  isRunning?: boolean;
}

export const CommentList = component$(
  ({
    comments,
    postId,
    addCommentAction,
  }: {
    comments: CommentTree[];
    postId: string;
    addCommentAction: ActionStore<any, any, true>;
  }) => {
    return (
      <div class="comment-list">
        {/* Top-level comment form */}
        <CommentForm
          postId={postId}
          parentId={null}
          addCommentAction={addCommentAction}
        />

        {/* Render top-level comments */}
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            postId={postId}
            addCommentAction={addCommentAction}
          />
        ))}

        {comments.length === 0 && (
          <p class="no-comments">No comments yet. Be the first to comment!</p>
        )}
      </div>
    );
  }
);

const CommentItem = component$(
  ({
    comment,
    postId,
    addCommentAction,
    depth = 0,
  }: {
    comment: CommentTree;
    postId: string;
    addCommentAction: ActionStore<any, any, true>;
    depth?: number;
  }) => {
    const showReplyForm = useSignal(false);
    const maxDepth = 10;
    const currentDepth = Math.min(depth, maxDepth);

    return (
      <div
        class="comment-item"
        style={{ marginLeft: `${currentDepth * 24}px` }}
      >
        <div class="comment-header">
          <strong class="comment-author">{comment.author}</strong>
          <span class="comment-date">
            {new Date(comment.createdAt).toLocaleString()}
          </span>
        </div>
        <p class="comment-text">{comment.text}</p>
        <div class="comment-actions">
          <button
            class="reply-btn"
            onClick$={() => {
              showReplyForm.value = !showReplyForm.value;
            }}
          >
            {showReplyForm.value ? "Cancel" : "Reply"}
          </button>
        </div>

        {showReplyForm.value && (
          <CommentForm
            postId={postId}
            parentId={comment.id}
            addCommentAction={addCommentAction}
            onSubmitted$={() => {
              showReplyForm.value = false;
            }}
          />
        )}

        {/* Recursively render replies */}
        {comment.replies.length > 0 && (
          <div class="replies">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                postId={postId}
                addCommentAction={addCommentAction}
                depth={currentDepth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

const CommentForm = component$(
  ({
    postId,
    parentId,
    addCommentAction,
    onSubmitted$,
  }: {
    postId: string;
    parentId: number | null;
    addCommentAction: ActionStore<any, any, true>;
    onSubmitted$?: any;
  }) => {
    const authorRef = useSignal("");
    const textRef = useSignal("");

    return (
      <Form
        action={addCommentAction}
        class="comment-form"
        onSubmitCompleted$={() => {
          authorRef.value = "";
          textRef.value = "";
          if (onSubmitted$) {
            onSubmitted$();
          }
        }}
      >
        <input type="hidden" name="postId" value={postId} />
        {parentId !== null && (
          <input type="hidden" name="parentId" value={String(parentId)} />
        )}

        <div class="form-group">
          <input
            type="text"
            name="author"
            placeholder="Your name"
            required
            class="form-input"
            bind:value={authorRef}
          />
        </div>

        <div class="form-group">
          <textarea
            name="text"
            placeholder={
              parentId !== null ? "Write a reply..." : "Write a comment..."
            }
            required
            class="form-textarea"
            rows={3}
            bind:value={textRef}
          />
        </div>

        <button type="submit" class="submit-btn" disabled={addCommentAction.isRunning}>
          {addCommentAction.isRunning ? "Submitting..." : parentId !== null ? "Reply" : "Comment"}
        </button>

        {addCommentAction.value?.success && (
          <p class="success-msg">Comment added successfully!</p>
        )}
        {addCommentAction.value && !addCommentAction.value.success && (
          <p class="error-msg">{addCommentAction.value.error}</p>
        )}
      </Form>
    );
  }
);
