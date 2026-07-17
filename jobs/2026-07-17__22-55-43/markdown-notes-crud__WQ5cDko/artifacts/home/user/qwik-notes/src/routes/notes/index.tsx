import { component$ } from "@builder.io/qwik";
import {
  routeLoader$,
  routeAction$,
  zod$,
  z,
  Link,
  Form,
} from "@builder.io/qwik-city";
import { createNote, deleteNote, listNotes } from "~/lib/db";

export const useNotesLoader = routeLoader$(() => {
  return listNotes();
});

export const useCreateNoteAction = routeAction$(
  (data) => {
    const note = createNote(data.title.trim(), data.content.trim());
    return {
      success: true as const,
      note,
    };
  },
  zod$({
    title: z.string().trim().min(1, "Title is required"),
    content: z.string().trim().min(1, "Content is required"),
  }),
);

export const useDeleteNoteAction = routeAction$(
  (data) => {
    const ok = deleteNote(data.id);
    return { success: ok };
  },
  zod$({
    id: z.coerce.number().int().positive(),
  }),
);

export default component$(() => {
  const notes = useNotesLoader();
  const createAction = useCreateNoteAction();
  const deleteAction = useDeleteNoteAction();

  return (
    <>
      <h1>Markdown Notes</h1>

      <section>
        <h2>New note</h2>
        <Form action={createAction}>
          <div>
            <label for="title">Title</label>
            <br />
            <input
              id="title"
              name="title"
              type="text"
              value={createAction.formData?.get("title")?.toString() ?? ""}
            />
          </div>
          <div>
            <label for="content">Content (Markdown)</label>
            <br />
            <textarea
              id="content"
              name="content"
              rows={8}
              cols={60}
              value={createAction.formData?.get("content")?.toString() ?? ""}
            />
          </div>

          {createAction.value?.failed && (
            <div role="alert" style={{ color: "red" }}>
              {createAction.value.fieldErrors?.title && (
                <p>{createAction.value.fieldErrors.title}</p>
              )}
              {createAction.value.fieldErrors?.content && (
                <p>{createAction.value.fieldErrors.content}</p>
              )}
            </div>
          )}

          <button type="submit">Create note</button>
        </Form>
      </section>

      <section>
        <h2>All notes</h2>
        {notes.value.length === 0 && <p>No notes yet.</p>}
        <ul>
          {notes.value.map((note) => (
            <li key={note.id}>
              <Link href={`/notes/${note.id}/`}>{note.title}</Link>{" "}
              <Link href={`/notes/${note.id}/edit/`}>edit</Link>{" "}
              <Form action={deleteAction} style={{ display: "inline" }}>
                <input type="hidden" name="id" value={note.id} />
                <button type="submit">delete</button>
              </Form>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
});
