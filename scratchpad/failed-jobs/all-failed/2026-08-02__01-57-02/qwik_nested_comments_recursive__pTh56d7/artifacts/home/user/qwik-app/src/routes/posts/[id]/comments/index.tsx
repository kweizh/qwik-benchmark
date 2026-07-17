import { component$, useSignal, $ } from "@builder.io/qwik";
import { type RequestHandler, routeLoader$, useLocation } from "@builder.io/qwik-city";
import { getCommentsTree, commentExists, addComment } from "~/db";

export const onGet: RequestHandler = async ({ request, json, params, next }) => {
  const accept = request.headers.get("accept") || "";
  if (accept.includes("application/json")) {
    const tree = getCommentsTree(params.id);
    json(200, tree);
    return;
  }
  await next();
};

export const onPost: RequestHandler = async ({ request, json, params }) => {
  try {
    const body = await request.json();
    const { parentId, text, author } = body;

    if (!text || typeof text !== "string" || !author || typeof author !== "string") {
      json(400, { error: "text and author are required and must be strings" });
      return;
    }

    if (parentId !== null && parentId !== undefined) {
      const pId = Number(parentId);
      if (isNaN(pId) || !commentExists(pId, params.id)) {
        json(400, { error: "Invalid or non-existent parentId" });
        return;
      }
    }

    const newComment = addComment(
      params.id,
      parentId !== undefined && parentId !== null ? Number(parentId) : null,
      text,
      author
    );

    json(201, newComment);
  } catch (err: any) {
    json(400, { error: "Invalid request payload: " + err.message });
  }
};

export const useComments = routeLoader$(({ params }) => {
  return getCommentsTree(params.id);
});

interface CommentNode {
  id: number;
  postId: string;
  parentId: number | null;
  text: string;
  author: string;
  createdAt: string;
  replies: CommentNode[];
}

interface CommentViewProps {
  comment: CommentNode;
  postId: string;
}

export const CommentView = component$<CommentViewProps>(({ comment, postId }) => {
  const showReplyForm = useSignal(false);
  const replyAuthor = useSignal("");
  const replyText = useSignal("");
  const isSubmitting = useSignal(false);
  const errorMsg = useSignal("");

  const handleReplySubmit = $(async () => {
    if (!replyAuthor.value || !replyText.value) {
      errorMsg.value = "Both fields are required.";
      return;
    }
    isSubmitting.value = true;
    errorMsg.value = "";
    try {
      const res = await fetch(`/posts/${postId}/comments`, {
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
      if (res.ok) {
        replyAuthor.value = "";
        replyText.value = "";
        showReplyForm.value = false;
        window.location.reload();
      } else {
        const data = await res.json();
        errorMsg.value = data.error || "Failed to submit reply.";
      }
    } catch (err: any) {
      errorMsg.value = "An error occurred: " + err.message;
    } finally {
      isSubmitting.value = false;
    }
  });

  return (
    <div
      class="comment-node"
      style={{
        marginLeft: "20px",
        borderLeft: "2px solid #ccc",
        paddingLeft: "10px",
        marginTop: "10px",
      }}
    >
      <div class="comment-header" style={{ fontWeight: "bold" }}>
        {comment.author}{" "}
        <span style={{ fontWeight: "normal", fontSize: "0.85em", color: "#666" }}>
          • {new Date(comment.createdAt).toLocaleString()}
        </span>
      </div>
      <div class="comment-body" style={{ margin: "5px 0" }}>
        {comment.text}
      </div>
      <div class="comment-actions">
        <button
          onClick$={() => (showReplyForm.value = !showReplyForm.value)}
          style={{
            background: "none",
            border: "none",
            color: "#0066cc",
            cursor: "pointer",
            textDecoration: "underline",
            padding: 0,
          }}
        >
          Reply
        </button>
      </div>

      {showReplyForm.value && (
        <form
          preventdefault:submit
          onSubmit$={handleReplySubmit}
          style={{ marginTop: "10px", maxWidth: "400px" }}
        >
          <div style={{ marginBottom: "5px" }}>
            <input
              type="text"
              placeholder="Your Name"
              value={replyAuthor.value}
              onInput$={(e) => (replyAuthor.value = (e.target as HTMLInputElement).value)}
              required
              style={{ width: "100%", padding: "5px" }}
            />
          </div>
          <div style={{ marginBottom: "5px" }}>
            <textarea
              placeholder="Write a reply..."
              value={replyText.value}
              onInput$={(e) => (replyText.value = (e.target as HTMLTextAreaElement).value)}
              required
              style={{ width: "100%", padding: "5px", height: "60px" }}
            />
          </div>
          {errorMsg.value && (
            <div style={{ color: "red", fontSize: "0.9em", marginBottom: "5px" }}>
              {errorMsg.value}
            </div>
          )}
          <button type="submit" disabled={isSubmitting.value} style={{ padding: "5px 10px" }}>
            {isSubmitting.value ? "Submitting..." : "Submit Reply"}
          </button>
          <button
            type="button"
            onClick$={() => (showReplyForm.value = false)}
            style={{ marginLeft: "5px", padding: "5px 10px" }}
          >
            Cancel
          </button>
        </form>
      )}

      <div class="comment-replies">
        {comment.replies.map((reply) => (
          <CommentView key={reply.id} comment={reply} postId={postId} />
        ))}
      </div>
    </div>
  );
});

export default component$(() => {
  const comments = useComments();
  const loc = useLocation();
  const postId = loc.params.id;

  const topAuthor = useSignal("");
  const topText = useSignal("");
  const isSubmitting = useSignal(false);
  const errorMsg = useSignal("");

  const handleTopSubmit = $(async () => {
    if (!topAuthor.value || !topText.value) {
      errorMsg.value = "Both fields are required.";
      return;
    }
    isSubmitting.value = true;
    errorMsg.value = "";
    try {
      const res = await fetch(`/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parentId: null,
          author: topAuthor.value,
          text: topText.value,
        }),
      });
      if (res.ok) {
        topAuthor.value = "";
        topText.value = "";
        window.location.reload();
      } else {
        const data = await res.json();
        errorMsg.value = data.error || "Failed to submit comment.";
      }
    } catch (err: any) {
      errorMsg.value = "An error occurred: " + err.message;
    } finally {
      isSubmitting.value = false;
    }
  });

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Comments for Post: {postId}</h1>

      {/* Form for new top-level comment */}
      <form
        preventdefault:submit
        onSubmit$={handleTopSubmit}
        style={{
          marginBottom: "30px",
          padding: "15px",
          border: "1px solid #ddd",
          borderRadius: "5px",
        }}
      >
        <h3>Add a comment</h3>
        <div style={{ marginBottom: "10px" }}>
          <input
            type="text"
            placeholder="Your Name"
            value={topAuthor.value}
            onInput$={(e) => (topAuthor.value = (e.target as HTMLInputElement).value)}
            required
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <textarea
            placeholder="Write a comment..."
            value={topText.value}
            onInput$={(e) => (topText.value = (e.target as HTMLTextAreaElement).value)}
            required
            style={{ width: "100%", padding: "8px", height: "100px", boxSizing: "border-box" }}
          />
        </div>
        {errorMsg.value && (
          <div style={{ color: "red", fontSize: "0.9em", marginBottom: "10px" }}>
            {errorMsg.value}
          </div>
        )}
        <button
          type="submit"
          disabled={isSubmitting.value}
          style={{ padding: "8px 15px", cursor: "pointer" }}
        >
          {isSubmitting.value ? "Submitting..." : "Submit Comment"}
        </button>
      </form>

      {/* Nested Comment Tree */}
      <div class="comments-tree">
        {comments.value.length === 0 ? (
          <p>No comments yet. Be the first to comment!</p>
        ) : (
          comments.value.map((comment) => (
            <CommentView key={comment.id} comment={comment} postId={postId} />
          ))
        )}
      </div>
    </div>
  );
});
