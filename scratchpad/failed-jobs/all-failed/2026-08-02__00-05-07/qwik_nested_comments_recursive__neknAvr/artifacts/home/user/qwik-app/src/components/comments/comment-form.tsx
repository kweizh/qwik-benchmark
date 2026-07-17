import { component$, useSignal, type PropFunction } from "@builder.io/qwik";

interface CommentFormProps {
  postId: string;
  parentId?: number | null;
  onSubmitted$?: PropFunction<() => void>;
}

/**
 * A small client-side form that posts a new comment/reply to
 * `POST /posts/:postId/comments` and reloads the page to reflect the
 * updated comment tree.
 */
export const CommentForm = component$<CommentFormProps>((props) => {
  const { postId, parentId = null } = props;
  const author = useSignal("");
  const text = useSignal("");
  const error = useSignal("");
  const submitting = useSignal(false);

  return (
    <form
      class="comment-form"
      preventdefault:submit
      onSubmit$={async () => {
        error.value = "";

        if (!author.value.trim() || !text.value.trim()) {
          error.value = "Name and comment text are both required.";
          return;
        }

        submitting.value = true;
        try {
          const res = await fetch(`/posts/${postId}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              parentId,
              text: text.value,
              author: author.value,
            }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}) as { error?: string });
            error.value = data.error ?? `Failed to submit comment (${res.status}).`;
            return;
          }

          author.value = "";
          text.value = "";

          if (props.onSubmitted$) {
            await props.onSubmitted$();
          }

          // Reload so the freshly rendered HTML page shows the new comment tree.
          window.location.reload();
        } finally {
          submitting.value = false;
        }
      }}
    >
      <div class="form-row">
        <label>
          Name
          <input
            type="text"
            name="author"
            value={author.value}
            required
            onInput$={(_, el) => (author.value = el.value)}
          />
        </label>
      </div>
      <div class="form-row">
        <label>
          Comment
          <textarea
            name="text"
            rows={3}
            required
            value={text.value}
            onInput$={(_, el) => (text.value = el.value)}
          />
        </label>
      </div>
      {error.value && <p class="form-error">{error.value}</p>}
      <button type="submit" disabled={submitting.value}>
        {parentId ? "Post Reply" : "Post Comment"}
      </button>
    </form>
  );
});
