import { component$, useSignal, $ } from "@builder.io/qwik";
import { type RequestHandler, routeLoader$, useLocation } from "@builder.io/qwik-city";
import { getCommentsForPost, insertComment, type CommentWithReplies } from "../../../../db";

export const onRequest: RequestHandler = async (requestEvent) => {
  if (requestEvent.method === "GET") {
    const accept = requestEvent.headers.get("accept") || "";
    if (accept.includes("application/json")) {
      const postId = requestEvent.params.id;
      const comments = getCommentsForPost(postId);
      requestEvent.json(200, comments);
    }
  }
};

export const onPost: RequestHandler = async (requestEvent) => {
  const postId = requestEvent.params.id;
  let body: any;
  try {
    body = await requestEvent.request.json();
  } catch {
    requestEvent.json(400, { error: "Invalid JSON payload" });
    return;
  }

  if (!body || typeof body !== "object") {
    requestEvent.json(400, { error: "Invalid JSON payload" });
    return;
  }

  const { parentId, text, author } = body;

  if (typeof text !== "string" || !text.trim()) {
    requestEvent.json(400, { error: "Text is required and must be a string" });
    return;
  }

  if (typeof author !== "string" || !author.trim()) {
    requestEvent.json(400, { error: "Author is required and must be a string" });
    return;
  }

  let parsedParentId: number | null = null;
  if (parentId !== undefined && parentId !== null) {
    parsedParentId = Number(parentId);
    if (isNaN(parsedParentId) || !Number.isInteger(parsedParentId)) {
      requestEvent.json(400, { error: "ParentId must be an integer" });
      return;
    }
  }

  try {
    const newComment = insertComment(postId, parsedParentId, text, author);
    requestEvent.json(201, newComment);
  } catch (err: any) {
    if (err.message === "PARENT_NOT_FOUND" || err.message === "PARENT_POST_MISMATCH") {
      requestEvent.json(404, { error: "Parent comment not found or does not belong to this post" });
    } else {
      requestEvent.json(500, { error: "Internal Server Error" });
    }
  }
};

export const useComments = routeLoader$(async (requestEvent) => {
  const postId = requestEvent.params.id;
  const comments = getCommentsForPost(postId);
  return comments;
});

interface CommentNodeProps {
  comment: CommentWithReplies;
  postId: string;
}

export const CommentNode = component$<CommentNodeProps>(({ comment, postId }) => {
  const isReplying = useSignal(false);
  const replyAuthor = useSignal("");
  const replyText = useSignal("");
  const errorMsg = useSignal("");

  const handleReplySubmit = $(async () => {
    errorMsg.value = "";

    if (!replyAuthor.value.trim() || !replyText.value.trim()) {
      errorMsg.value = "Both author and text are required.";
      return;
    }

    try {
      const response = await fetch(`/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parentId: comment.id,
          author: replyAuthor.value,
          text: replyText.value,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        errorMsg.value = errData.error || "Failed to add reply.";
        return;
      }

      replyAuthor.value = "";
      replyText.value = "";
      isReplying.value = false;
      window.location.reload();
    } catch {
      errorMsg.value = "An error occurred. Please try again.";
    }
  });

  return (
    <div class="comment-node" style={{ marginLeft: "20px", borderLeft: "2px solid #ccc", paddingLeft: "15px", marginBottom: "15px" }}>
      <div class="comment-header" style={{ fontWeight: "bold", fontSize: "0.95rem" }}>
        {comment.author} <span style={{ fontWeight: "normal", color: "#666", fontSize: "0.8rem" }}>at {new Date(comment.createdAt).toLocaleString()}</span>
      </div>
      <div class="comment-body" style={{ margin: "5px 0", fontSize: "1rem", whiteSpace: "pre-wrap" }}>
        {comment.text}
      </div>
      <div class="comment-actions">
        <button
          onClick$={() => { isReplying.value = !isReplying.value; }}
          style={{ background: "none", border: "none", color: "#0070f3", cursor: "pointer", padding: "0", fontSize: "0.85rem" }}
        >
          {isReplying.value ? "Cancel" : "Reply"}
        </button>
      </div>

      {isReplying.value && (
        <form preventdefault:submit onSubmit$={handleReplySubmit} style={{ marginTop: "10px", maxWidth: "400px" }}>
          <div style={{ marginBottom: "8px" }}>
            <input
              type="text"
              placeholder="Your Name"
              value={replyAuthor.value}
              onInput$={(e) => { replyAuthor.value = (e.target as HTMLInputElement).value; }}
              style={{ width: "100%", padding: "6px", boxSizing: "border-box" }}
              required
            />
          </div>
          <div style={{ marginBottom: "8px" }}>
            <textarea
              placeholder="Write a reply..."
              value={replyText.value}
              onInput$={(e) => { replyText.value = (e.target as HTMLTextAreaElement).value; }}
              style={{ width: "100%", padding: "6px", boxSizing: "border-box", minHeight: "60px" }}
              required
            />
          </div>
          {errorMsg.value && <div style={{ color: "red", fontSize: "0.85rem", marginBottom: "8px" }}>{errorMsg.value}</div>}
          <button type="submit" style={{ padding: "6px 12px", backgroundColor: "#0070f3", color: "white", border: "none", cursor: "pointer" }}>
            Submit Reply
          </button>
        </form>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div class="comment-replies" style={{ marginTop: "15px" }}>
          {comment.replies.map((reply) => (
            <CommentNode key={reply.id} comment={reply} postId={postId} />
          ))}
        </div>
      )}
    </div>
  );
});

export default component$(() => {
  const commentsSignal = useComments();
  const location = useLocation();
  const postId = location.params.id;

  const author = useSignal("");
  const text = useSignal("");
  const errorMsg = useSignal("");

  const handleSubmit = $(async () => {
    errorMsg.value = "";

    if (!author.value.trim() || !text.value.trim()) {
      errorMsg.value = "Both author and text are required.";
      return;
    }

    try {
      const response = await fetch(`/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parentId: null,
          author: author.value,
          text: text.value,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        errorMsg.value = errData.error || "Failed to add comment.";
        return;
      }

      author.value = "";
      text.value = "";
      window.location.reload();
    } catch {
      errorMsg.value = "An error occurred. Please try again.";
    }
  });

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Comments for Post: {postId}</h1>

      {/* Top-level Comment Form */}
      <div style={{ border: "1px solid #eaeaea", borderRadius: "5px", padding: "20px", marginBottom: "30px", backgroundColor: "#fafafa" }}>
        <h3>Add a Comment</h3>
        <form preventdefault:submit onSubmit$={handleSubmit}>
          <div style={{ marginBottom: "12px" }}>
            <input
              type="text"
              placeholder="Your Name"
              value={author.value}
              onInput$={(e) => { author.value = (e.target as HTMLInputElement).value; }}
              style={{ width: "100%", padding: "8px", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #ccc" }}
              required
            />
          </div>
          <div style={{ marginBottom: "12px" }}>
            <textarea
              placeholder="Write a comment..."
              value={text.value}
              onInput$={(e) => { text.value = (e.target as HTMLTextAreaElement).value; }}
              style={{ width: "100%", padding: "8px", boxSizing: "border-box", minHeight: "100px", borderRadius: "4px", border: "1px solid #ccc" }}
              required
            />
          </div>
          {errorMsg.value && <div style={{ color: "red", fontSize: "0.9rem", marginBottom: "12px" }}>{errorMsg.value}</div>}
          <button type="submit" style={{ padding: "10px 20px", backgroundColor: "#0070f3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
            Submit Comment
          </button>
        </form>
      </div>

      {/* Comments List */}
      <div class="comments-list">
        {commentsSignal.value.length === 0 ? (
          <p style={{ color: "#666", fontStyle: "italic" }}>No comments yet. Be the first to comment!</p>
        ) : (
          commentsSignal.value.map((comment) => (
            <CommentNode key={comment.id} comment={comment} postId={postId} />
          ))
        )}
      </div>
    </div>
  );
});
