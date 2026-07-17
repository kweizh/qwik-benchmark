import { component$, useSignal, $, type PropFunction, type Signal } from "@builder.io/qwik";
import { type RequestHandler, routeLoader$, useLocation } from "@builder.io/qwik-city";
import { getDb, toISOString } from "../../../../db";

// Endpoint to handle GET for JSON or fallback to HTML
export const onGet: RequestHandler = async (event) => {
  const accept = event.request.headers.get("accept") || "";
  if (accept.includes("application/json")) {
    const postId = event.params.id;
    const db = await getDb();
    const rows = await db.all('SELECT * FROM Comment WHERE postId = ? ORDER BY createdAt ASC', [postId]);
    
    const nodes = rows.map(row => ({
      id: row.id,
      postId: row.postId,
      parentId: row.parentId,
      text: row.text,
      author: row.author,
      createdAt: toISOString(row.createdAt),
      replies: [] as any[]
    }));
    
    const map = new Map<number, any>();
    for (const node of nodes) {
      map.set(node.id, node);
    }
    
    const tree: any[] = [];
    for (const node of nodes) {
      if (node.parentId === null) {
        tree.push(node);
      } else {
        const parentNode = map.get(node.parentId);
        if (parentNode) {
          parentNode.replies.push(node);
        }
      }
    }
    
    event.json(200, tree);
  }
};

// Endpoint to handle POST for adding comments/replies
export const onPost: RequestHandler = async (event) => {
  try {
    const postId = event.params.id;
    let body;
    try {
      body = await event.request.json();
    } catch {
      event.json(400, { error: "Invalid JSON body" });
      return;
    }
    
    const { parentId, text, author } = body;
    
    if (!text || typeof text !== "string" || !text.trim()) {
      event.json(400, { error: "text is required and must be a non-empty string" });
      return;
    }
    
    if (!author || typeof author !== "string" || !author.trim()) {
      event.json(400, { error: "author is required and must be a non-empty string" });
      return;
    }
    
    const db = await getDb();
    
    let parsedParentId: number | null = null;
    if (parentId !== undefined && parentId !== null) {
      parsedParentId = Number(parentId);
      if (isNaN(parsedParentId)) {
        event.json(400, { error: "parentId must be a valid number" });
        return;
      }
      
      const parent = await db.get('SELECT postId FROM Comment WHERE id = ?', [parsedParentId]);
      if (!parent) {
        event.json(404, { error: "Parent comment not found" });
        return;
      }
      if (parent.postId !== postId) {
        event.json(400, { error: "Parent comment belongs to a different post" });
        return;
      }
    }
    
    const result = await db.run(
      'INSERT INTO Comment (postId, parentId, text, author) VALUES (?, ?, ?, ?)',
      [postId, parsedParentId, text.trim(), author.trim()]
    );
    
    const newId = result.lastID;
    const newComment = await db.get('SELECT * FROM Comment WHERE id = ?', [newId]);
    
    event.json(201, {
      id: newComment.id,
      postId: newComment.postId,
      parentId: newComment.parentId,
      text: newComment.text,
      author: newComment.author,
      createdAt: toISOString(newComment.createdAt)
    });
  } catch (err: any) {
    event.json(500, { error: err.message });
  }
};

// Loader to fetch comments for HTML rendering
export const useComments = routeLoader$(async (requestEvent) => {
  const postId = requestEvent.params.id;
  const db = await getDb();
  const rows = await db.all('SELECT * FROM Comment WHERE postId = ? ORDER BY createdAt ASC', [postId]);
  
  const nodes = rows.map(row => ({
    id: row.id,
    postId: row.postId,
    parentId: row.parentId,
    text: row.text,
    author: row.author,
    createdAt: toISOString(row.createdAt),
    replies: [] as any[]
  }));
  
  const map = new Map<number, any>();
  for (const node of nodes) {
    map.set(node.id, node);
  }
  
  const tree: any[] = [];
  for (const node of nodes) {
    if (node.parentId === null) {
      tree.push(node);
    } else {
      const parentNode = map.get(node.parentId);
      if (parentNode) {
        parentNode.replies.push(node);
      }
    }
  }
  
  return tree;
});

// Recursive Comment Item Component
export const CommentItem = component$((props: {
  comment: any;
  activeReplyId: Signal<number | null>;
  replyAuthor: Signal<string>;
  replyText: Signal<string>;
  replyFormError: Signal<string>;
  isReplying: Signal<boolean>;
  onReplySubmit: PropFunction<(parentId: number) => void>;
}) => {
  const comment = props.comment;
  const showReplyForm = props.activeReplyId.value === comment.id;

  return (
    <div class="comment-item">
      <div class="comment-header">
        <span class="comment-author">{comment.author}</span>
        <span class="comment-date">
          {new Date(comment.createdAt).toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
        </span>
      </div>
      <p class="comment-text">{comment.text}</p>
      
      {!showReplyForm && (
        <button
          class="btn"
          onClick$={() => {
            props.activeReplyId.value = comment.id;
            props.replyAuthor.value = "";
            props.replyText.value = "";
            props.replyFormError.value = "";
          }}
        >
          Reply
        </button>
      )}

      {showReplyForm && (
        <div class="reply-form-container">
          <h4 style={{ margin: "0 0 10px 0", fontSize: "0.9rem", color: "#374151" }}>
            Reply to {comment.author}
          </h4>
          <div class="form-group">
            <label class="form-label">Name</label>
            <input
              type="text"
              class="form-input"
              placeholder="Your name"
              value={props.replyAuthor.value}
              onInput$={(e, el) => { props.replyAuthor.value = el.value; }}
            />
          </div>
          <div class="form-group">
            <label class="form-label">Comment</label>
            <textarea
              class="form-input form-textarea"
              placeholder="Write a reply..."
              value={props.replyText.value}
              onInput$={(e, el) => { props.replyText.value = el.value; }}
            />
          </div>
          {props.replyFormError.value && (
            <p class="error-message">{props.replyFormError.value}</p>
          )}
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button
              class="btn btn-primary"
              disabled={props.isReplying.value}
              onClick$={() => props.onReplySubmit(comment.id)}
            >
              {props.isReplying.value ? "Submitting..." : "Submit Reply"}
            </button>
            <button
              class="btn btn-secondary"
              onClick$={() => { props.activeReplyId.value = null; }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div class="comment-replies" style={{ marginTop: "10px" }}>
          {comment.replies.map((reply: any) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              activeReplyId={props.activeReplyId}
              replyAuthor={props.replyAuthor}
              replyText={props.replyText}
              replyFormError={props.replyFormError}
              isReplying={props.isReplying}
              onReplySubmit={props.onReplySubmit}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// Main Page Component
export default component$(() => {
  const loc = useLocation();
  const comments = useComments();
  
  // State for top-level comment form
  const newAuthor = useSignal("");
  const newText = useSignal("");
  const newFormError = useSignal("");
  const isSubmitting = useSignal(false);
  
  // State for active reply form (shared across all comments)
  const activeReplyId = useSignal<number | null>(null);
  const replyAuthor = useSignal("");
  const replyText = useSignal("");
  const replyFormError = useSignal("");
  const isReplying = useSignal(false);
  
  // Handler to submit top-level comment
  const handleTopLevelSubmit = $(async () => {
    if (!newAuthor.value.trim() || !newText.value.trim()) {
      newFormError.value = "Both Name and Comment fields are required.";
      return;
    }
    
    newFormError.value = "";
    isSubmitting.value = true;
    
    try {
      const response = await fetch(`/posts/${loc.params.id}/comments/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          parentId: null,
          author: newAuthor.value.trim(),
          text: newText.value.trim()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        newFormError.value = errorData.error || "Failed to submit comment.";
      } else {
        // Clear fields and reload page to show new comment
        newAuthor.value = "";
        newText.value = "";
        window.location.reload();
      }
    } catch (err: any) {
      newFormError.value = err.message || "An unexpected error occurred.";
    } finally {
      isSubmitting.value = false;
    }
  });
  
  // Handler to submit a nested reply
  const handleReplySubmit = $(async (parentId: number) => {
    if (!replyAuthor.value.trim() || !replyText.value.trim()) {
      replyFormError.value = "Both Name and Comment fields are required.";
      return;
    }
    
    replyFormError.value = "";
    isReplying.value = true;
    
    try {
      const response = await fetch(`/posts/${loc.params.id}/comments/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          parentId,
          author: replyAuthor.value.trim(),
          text: replyText.value.trim()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        replyFormError.value = errorData.error || "Failed to submit reply.";
      } else {
        // Clear fields, reset active reply, and reload page
        replyAuthor.value = "";
        replyText.value = "";
        activeReplyId.value = null;
        window.location.reload();
      }
    } catch (err: any) {
      replyFormError.value = err.message || "An unexpected error occurred.";
    } finally {
      isReplying.value = false;
    }
  });

  return (
    <div class="container">
      <style>{`
        body {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background-color: #f9fafb;
          color: #1f2937;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06);
        }
        h1 {
          font-size: 1.8rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          color: #111827;
          border-bottom: 2px solid #f3f4f6;
          padding-bottom: 10px;
        }
        .comment-list {
          margin-top: 20px;
        }
        .comment-item {
          position: relative;
          margin-top: 15px;
          padding-left: 15px;
          border-left: 2px solid #e5e7eb;
        }
        .comment-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          margin-bottom: 6px;
        }
        .comment-author {
          font-weight: 600;
          color: #374151;
        }
        .comment-date {
          color: #9ca3af;
          font-size: 0.8rem;
        }
        .comment-text {
          font-size: 0.95rem;
          line-height: 1.5;
          color: #4b5563;
          margin: 0 0 8px 0;
          white-space: pre-wrap;
        }
        .btn {
          font-size: 0.85rem;
          font-weight: 500;
          padding: 6px 12px;
          border-radius: 4px;
          border: 1px solid #d1d5db;
          background: white;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-primary {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
        }
        .btn-primary:hover {
          background: #1d4ed8;
          border-color: #1d4ed8;
        }
        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
          border-color: #d1d5db;
        }
        .btn-secondary:hover {
          background: #e5e7eb;
        }
        .form-group {
          margin-bottom: 12px;
        }
        .form-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: #4b5563;
          margin-bottom: 4px;
        }
        .form-input {
          width: 100%;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #d1d5db;
          font-size: 0.9rem;
          box-sizing: border-box;
        }
        .form-input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .form-textarea {
          min-height: 80px;
          resize: vertical;
        }
        .reply-form-container {
          margin-top: 10px;
          background: #f9fafb;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          max-width: 500px;
        }
        .new-comment-container {
          margin-top: 30px;
          border-top: 2px solid #f3f4f6;
          padding-top: 20px;
        }
        .error-message {
          color: #dc2626;
          font-size: 0.85rem;
          margin-top: 4px;
          margin-bottom: 8px;
        }
        .empty-state {
          color: #6b7280;
          font-style: italic;
          padding: 20px 0;
        }
      `}</style>

      <h1>Comments for Post: {loc.params.id}</h1>
      
      <div class="comment-list">
        {comments.value.length === 0 ? (
          <p class="empty-state">No comments yet. Be the first to comment!</p>
        ) : (
          comments.value.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              activeReplyId={activeReplyId}
              replyAuthor={replyAuthor}
              replyText={replyText}
              replyFormError={replyFormError}
              isReplying={isReplying}
              onReplySubmit={handleReplySubmit}
            />
          ))
        )}
      </div>

      <div class="new-comment-container">
        <h3 style={{ margin: "0 0 15px 0", fontSize: "1.2rem", color: "#111827" }}>
          Add a Comment
        </h3>
        <div class="form-group">
          <label class="form-label">Name</label>
          <input
            type="text"
            class="form-input"
            placeholder="Your name"
            value={newAuthor.value}
            onInput$={(e, el) => { newAuthor.value = el.value; }}
          />
        </div>
        <div class="form-group">
          <label class="form-label">Comment</label>
          <textarea
            class="form-input form-textarea"
            placeholder="Write your comment..."
            value={newText.value}
            onInput$={(e, el) => { newText.value = el.value; }}
          />
        </div>
        {newFormError.value && (
          <p class="error-message">{newFormError.value}</p>
        )}
        <button
          class="btn btn-primary"
          disabled={isSubmitting.value}
          onClick$={handleTopLevelSubmit}
        >
          {isSubmitting.value ? "Submitting..." : "Submit Comment"}
        </button>
      </div>
    </div>
  );
});
