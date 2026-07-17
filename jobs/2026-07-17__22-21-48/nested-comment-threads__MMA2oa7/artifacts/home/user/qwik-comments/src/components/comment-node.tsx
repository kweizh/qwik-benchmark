import { component$, useSignal } from "@builder.io/qwik";
import { Form, type ActionStore } from "@builder.io/qwik-city";
import type { TreeNode } from "../routes/index";

interface Props {
  node: TreeNode;
  depth: number;
  action: ActionStore<any, any, boolean>;
}

export const CommentNode = component$<Props>(({ node, depth, action }) => {
  // Per-subtree collapse state.
  const collapsed = useSignal(false);
  const showReplyForm = useSignal(false);

  const hasReplies = node.children.length > 0;

  return (
    <div
      class="comment"
      data-comment-id={String(node.id)}
      data-depth={String(depth)}
    >
      <div class="comment-header">
        <span class="comment-author">{node.author}</span>
        <span class="comment-meta">{new Date(node.created_at).toLocaleString()}</span>
        <span class="reply-count" data-reply-count={String(node.replyCount)}>
          {node.replyCount} {node.replyCount === 1 ? "reply" : "replies"}
        </span>
        {hasReplies && (
          <button
            type="button"
            class="toggle"
            data-testid={`toggle-${node.id}`}
            aria-expanded={!collapsed.value}
            onClick$={() => {
              collapsed.value = !collapsed.value;
            }}
          >
            {collapsed.value ? "[+] expand" : "[-] collapse"}
          </button>
        )}
        <button
          type="button"
          class="toggle"
          onClick$={() => {
            showReplyForm.value = !showReplyForm.value;
          }}
        >
          {showReplyForm.value ? "cancel" : "reply"}
        </button>
      </div>

      <div class="comment-body">{node.body}</div>

      <Form
        action={action}
        class="reply-form"
        style={showReplyForm.value ? "" : "display:none"}
      >
        <input type="hidden" name="parent_id" value={String(node.id)} />
        <input
          type="text"
          name="author"
          placeholder="Your name"
          value={action.value?.failed ? (action.value.author as string) : ""}
        />
        <textarea name="body" placeholder="Your reply"></textarea>
        <button type="submit">Post reply</button>
        {action.value?.failed && (
          <div class="error">{action.value.error}</div>
        )}
      </Form>

      {hasReplies && (
        <div
          class="children"
          style={collapsed.value ? "display:none" : ""}
        >
          {node.children.map((child) => (
            <CommentNode
              key={child.id}
              node={child}
              depth={depth + 1}
              action={action}
            />
          ))}
        </div>
      )}
    </div>
  );
});