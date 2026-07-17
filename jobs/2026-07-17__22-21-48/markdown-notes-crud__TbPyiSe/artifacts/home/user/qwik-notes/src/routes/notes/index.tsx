import { component$ } from "@builder.io/qwik";
import {
  routeLoader$,
  routeAction$,
  zod$,
  z,
  Form,
  Link,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { listNotes, createNote, deleteNote } from "~/server/db";

/** Loads every note so the list can be rendered server-side. */
export const useNotes = routeLoader$(async () => {
  return listNotes();
});

/** Creates a new note from a title + Markdown content. */
export const useCreateNote = routeAction$(
  async (data) => {
    const note = createNote(data);
    return { success: true, id: note.id };
  },
  zod$({
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Content is required"),
  }),
);

/** Deletes a single note by id. */
export const useDeleteNote = routeAction$(
  async (data) => {
    const removed = deleteNote(data.id);
    if (!removed) {
      return { success: false, id: data.id };
    }
    return { success: true, id: data.id };
  },
  zod$({
    id: z.coerce.number().int().positive(),
  }),
);

export default component$(() => {
  const notes = useNotes();
  const createAction = useCreateNote();
  const deleteAction = useDeleteNote();

  return (
    <div class="layout">
      <h1>Notes</h1>

      <nav class="nav">
        <Link href="/">Home</Link>
      </nav>

      <section class="card">
        <h2>Create a note</h2>
        <Form action={createAction}>
          <div
            class={{
              "form-field": true,
              invalid: !!createAction.value?.fieldErrors?.title,
            }}
          >
            <label for="title">Title</label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="Note title"
              value={createAction.formData?.get("title") ?? ""}
            />
            {createAction.value?.fieldErrors?.title && (
              <p class="field-error">{createAction.value.fieldErrors.title}</p>
            )}
          </div>

          <div
            class={{
              "form-field": true,
              invalid: !!createAction.value?.fieldErrors?.content,
            }}
          >
            <label for="content">Content (Markdown)</label>
            <textarea
              id="content"
              name="content"
              placeholder="Write your note in Markdown..."
            >
              {createAction.formData?.get("content") ?? ""}
            </textarea>
            {createAction.value?.fieldErrors?.content && (
              <p class="field-error">
                {createAction.value.fieldErrors.content}
              </p>
            )}
          </div>

          <div class="form-actions">
            <button type="submit" class="primary">
              Create note
            </button>
            {createAction.value?.success && (
              <span>Note created successfully.</span>
            )}
          </div>
        </Form>
      </section>

      <section class="card">
        <h2>All notes ({notes.value.length})</h2>
        {notes.value.length === 0 ? (
          <p class="empty">No notes yet. Create one above!</p>
        ) : (
          <ul class="note-list">
            {notes.value.map((note) => (
              <li key={note.id}>
                <Link href={`/notes/${note.id}`}>{note.title}</Link>
                <Form action={deleteAction}>
                  <input type="hidden" name="id" value={note.id} />
                  <button type="submit" class="danger">
                    Delete
                  </button>
                </Form>
              </li>
            ))}
          </ul>
        )}
        {deleteAction.value && !deleteAction.value.success && (
          <p class="field-error">
            Note {deleteAction.value.id} could not be deleted.
          </p>
        )}
      </section>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Notes",
  meta: [
    {
      name: "description",
      content: "Browse, create, and delete Markdown notes.",
    },
  ],
};