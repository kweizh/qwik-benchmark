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
import { createNote, deleteNote, listNotes } from "~/lib/db";

/**
 * Server-side loader: read all notes from SQLite.
 *
 * Because `routeLoader$` is a server-only boundary, the
 * `better-sqlite3` import inside `~/lib/db` never leaks into the client
 * bundle.
 */
export const useNotesLoader = routeLoader$(() => {
  return {
    notes: listNotes(),
  };
});

/**
 * Server-side action: create a new note.
 *
 * `zod$` validates the form payload on the server. Empty titles / empty
 * content are rejected before anything is written.
 */
export const useCreateNoteAction = routeAction$(
  async (data) => {
    const note = createNote({
      title: data.title,
      content: data.content,
    });
    return { success: true as const, id: note.id };
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

/**
 * Server-side action: delete a note by id.
 */
export const useDeleteNoteAction = routeAction$(
  async (data) => {
    const removed = deleteNote(data.id);
    return { success: removed };
  },
  zod$({
    id: z.coerce.number().int().positive(),
  }),
);

/**
 * Render the first message from either a string or a string array —
 * `flattenZodIssues` returns a string for scalar fields and a string[]
 * for array fields, so we have to handle both.
 */
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
  const notesSig = useNotesLoader();
  const createAction = useCreateNoteAction();
  const deleteAction = useDeleteNoteAction();

  const isCreateFailed = createAction.value?.failed === true;
  const createFieldErrors = isCreateFailed
    ? (createAction.value as { fieldErrors?: Record<string, unknown> })
        .fieldErrors
    : undefined;
  const createFormErrors = isCreateFailed
    ? (createAction.value as { formErrors?: string[] }).formErrors
    : undefined;
  const titleError = firstError(createFieldErrors?.title);
  const contentError = firstError(createFieldErrors?.content);

  const isDeleteFailed = deleteAction.value?.failed === true;
  const deleteErrorMessage =
    isDeleteFailed && (deleteAction.value as { formErrors?: string[] }).formErrors
      ? (deleteAction.value as { formErrors: string[] }).formErrors[0]
      : undefined;

  return (
    <section class="notes-page">
      <h1>My Notes</h1>

      <div class="create-card">
        <h2>New note</h2>
        <Form action={createAction} class="create-form">
          <label>
            <span>Title</span>
            <input
              type="text"
              name="title"
              placeholder="Note title"
              value={
                createAction.formData?.get("title")?.toString() ?? ""
              }
              required
            />
            {titleError && <small class="error">{titleError}</small>}
          </label>
          <label>
            <span>Markdown content</span>
            <textarea
              name="content"
              rows={6}
              placeholder="# Hello&#10;Write **Markdown** here…"
              required
            >
              {createAction.formData?.get("content")?.toString() ?? ""}
            </textarea>
            {contentError && <small class="error">{contentError}</small>}
          </label>
          {createFormErrors && createFormErrors.length > 0 && (
            <p class="error">{createFormErrors[0]}</p>
          )}
          <button
            type="submit"
            class="button primary"
            disabled={createAction.isRunning}
          >
            {createAction.isRunning ? "Creating…" : "Create note"}
          </button>
        </Form>
      </div>

      <h2>All notes</h2>
      {deleteErrorMessage && <p class="error">{deleteErrorMessage}</p>}
      {notesSig.value.notes.length === 0 ? (
        <p class="empty">No notes yet — create your first one above.</p>
      ) : (
        <ul class="notes-list">
          {notesSig.value.notes.map((note) => (
            <li key={note.id} class="note-item">
              <div class="note-meta">
                <Link href={`/notes/${note.id}`} class="note-title">
                  {note.title}
                </Link>
                <small class="note-dates">updated {note.updated_at}</small>
              </div>
              <div class="note-actions">
                <Link href={`/notes/${note.id}/edit`} class="button">
                  Edit
                </Link>
                <Form action={deleteAction} class="inline-form">
                  <input type="hidden" name="id" value={note.id} />
                  <button
                    type="submit"
                    class="button danger"
                    onClick$={(event) => {
                      if (
                        !confirm(
                          `Delete note "${note.title}"? This cannot be undone.`,
                        )
                      ) {
                        event.preventDefault();
                      }
                    }}
                  >
                    Delete
                  </button>
                </Form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
});

export const head: DocumentHead = {
  title: "Notes · Markdown Notes",
  meta: [
    {
      name: "description",
      content: "Browse, create and delete your local Markdown notes.",
    },
  ],
};