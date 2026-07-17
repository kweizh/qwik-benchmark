import { component$ } from "@builder.io/qwik";
import {
  Form,
  Link,
  routeAction$,
  routeLoader$,
  zod$,
  z,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { getNote, updateNote } from "~/lib/db";

/**
 * Server-side loader: fetch the note being edited so the form can be
 * pre-filled. Returns 404 if the id is unknown.
 */
export const useEditLoader = routeLoader$(async (event) => {
  const id = Number(event.params.id);
  if (!Number.isFinite(id) || id <= 0 || !Number.isInteger(id)) {
    throw event.error(404, "Note not found");
  }
  const note = getNote(id);
  if (!note) {
    throw event.error(404, "Note not found");
  }
  return {
    id: note.id,
    title: note.title,
    content: note.content,
  };
});

/**
 * Server-side action: update the note. Validates the input with
 * `zod$` and writes through the SQLite helper. If the note has
 * vanished between the GET and the POST, return 404.
 */
export const useUpdateNoteAction = routeAction$(
  async (data, event) => {
    const id = Number(event.params.id);
    if (!Number.isFinite(id) || id <= 0 || !Number.isInteger(id)) {
      throw event.error(404, "Note not found");
    }
    const updated = updateNote(id, {
      title: data.title,
      content: data.content,
    });
    if (!updated) {
      throw event.error(404, "Note not found");
    }
    return { success: true as const };
  },
  zod$({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title is too long"),
    content: z.string().min(1, "Content is required"),
  }),
);

function firstError(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  if (typeof value === "string") {
    return value;
  }
  return undefined;
}

export default component$(() => {
  const editSig = useEditLoader();
  const updateAction = useUpdateNoteAction();
  const note = editSig.value;

  const isFailed = updateAction.value?.failed === true;
  const fieldErrors = isFailed
    ? (updateAction.value as { fieldErrors?: Record<string, unknown> })
        .fieldErrors
    : undefined;
  const formErrors = isFailed
    ? (updateAction.value as { formErrors?: string[] }).formErrors
    : undefined;

  // Pre-fill from the loader, but if the user already submitted the
  // form and it failed, keep whatever they typed instead.
  const submittedTitle =
    updateAction.formData?.get("title")?.toString() ?? note.title;
  const submittedContent =
    updateAction.formData?.get("content")?.toString() ?? note.content;

  return (
    <section class="note-edit">
      <p class="back-link">
        <Link href={`/notes/${note.id}`}>← Back to note</Link>
      </p>
      <h1>Edit note</h1>

      <Form action={updateAction} class="edit-form">
        <label>
          <span>Title</span>
          <input
            type="text"
            name="title"
            value={submittedTitle}
            required
          />
          {firstError(fieldErrors?.title) && (
            <small class="error">{firstError(fieldErrors?.title)}</small>
          )}
        </label>
        <label>
          <span>Markdown content</span>
          <textarea name="content" rows={14} required>
            {submittedContent}
          </textarea>
          {firstError(fieldErrors?.content) && (
            <small class="error">{firstError(fieldErrors?.content)}</small>
          )}
        </label>
        {formErrors && formErrors.length > 0 && (
          <p class="error">{formErrors[0]}</p>
        )}
        <div class="form-actions">
          <button
            type="submit"
            class="button primary"
            disabled={updateAction.isRunning}
          >
            {updateAction.isRunning ? "Saving…" : "Save changes"}
          </button>
          <Link href={`/notes/${note.id}`} class="button">
            Cancel
          </Link>
        </div>
      </Form>
    </section>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const note = resolveValue(useEditLoader);
  return {
    title: `Edit "${note.title}" · Markdown Notes`,
  };
};