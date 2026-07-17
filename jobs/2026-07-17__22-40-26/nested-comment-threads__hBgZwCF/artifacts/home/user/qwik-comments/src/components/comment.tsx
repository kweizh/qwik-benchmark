import { component$, useSignal, $ } from "@builder.io/qwik";
import { Form, type ActionStore } from "@builder.io/qwik-city";
import type { CommentNode } from "./lib/db";

export interface CommentProps {
  node: CommentNode;
  depth: number;
  replyCount: number;
  // Qwik serializes the action store lazily when used in client code; here we
  // accept the per-parent action store so each comment can submit to its own
  // reply action. The action must take fields `author`, `body`, `parentId`.
  replyAction: ActionStore<unknown, { author: string; body: string; parentId: number }, true>;
}

export const Comment = component$<CommentProps>(
  ({ node, depth, replyCount, replyAction }) => {
    const collapsed = useSignal(false);
    const hasChildren = node.children.length > 0;

    const toggle = $(() => {
      collapsed.value = !collapsed.value;
    });

    return (
      <div class="comment" data-comment-id={node.id} data-depth={depth}>
        <div class="comment-header">
          <span class="comment-author">{node.author}</span>
          <span class="comment-meta">{new Date(node.createdAt).toLocaleString()}</span>
        </div>
        <div class="comment-body">{node.body}</div>
        <div class="comment-meta">
          <span data-reply-count={replyCount}>
            {replyCount} {replyCount === 1 ? "reply" : "replies"}
          </span>
          {hasChildren && (
            <button
              type="button"
              class="toggle-btn"
              data-testid={`toggle-${node.id}`}
              onClick$={toggle}
              aria-expanded={!collapsed.value}
            >
              {collapsed.value ? "Expand" : "Collapse"}
            </button>
          )}
        </div>

        {!collapsed.value && hasChildren && (
          <div class="children">
            {node.children.map((child) => (
              <Comment
                key={child.id}
                node={child}
                depth={depth + 1}
                replyCount={countDescendants(child)}
                replyAction={replyAction}
              />
            ))}
          </div>
        )}

        {collapsed.value && hasChildren && (
          <div class="collapsed-hint">(subtree collapsed)</div>
        )}

        <Form action={replyAction} class="reply-form">
          <input type="hidden" name="parentId" value={node.id} />
          <input type="text" name="author" placeholder="Author" />
          <textarea
            name="body"
            placeholder="Write a reply..."
            rows={2}
          ></textarea>
          {replyAction.value?.failed && replyAction.value.fieldErrors && (
            <div class="error">
              {Object.values(replyAction.value.fieldErrors)
                .flat()
                .filter(Boolean)
                .join(" ")}
            </div>
          )}
          <button type="submit">Reply</button>
        </Form>
      </div>
    );
  }
);

function countDescendants(node: CommentNode): number {
  let total = node.children.length;
  for (const child of node.children) {
    total += countDescendants(child);
  }
  return total;
}