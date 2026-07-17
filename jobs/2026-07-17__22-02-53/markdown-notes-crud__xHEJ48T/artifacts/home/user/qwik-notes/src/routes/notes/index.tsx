import { component$ } from '@builder.io/qwik';
import { routeLoader$, routeAction$, zod$, z, Form } from '@builder.io/qwik-city';
import db, { type Note } from '../../db';

export const useNotesLoader = routeLoader$(async () => {
  const notes = db.prepare('SELECT * FROM notes ORDER BY created_at DESC').all() as Note[];
  return notes;
});

export const useCreateNoteAction = routeAction$(
  async (data, { redirect }) => {
    const { title, content } = data;
    const stmt = db.prepare('INSERT INTO notes (title, content) VALUES (?, ?)');
    stmt.run(title, content);
    throw redirect(303, '/notes');
  },
  zod$({
    title: z.string().trim().min(1, 'Title cannot be blank'),
    content: z.string().trim().min(1, 'Content cannot be blank'),
  })
);

export const useDeleteNoteAction = routeAction$(
  async (data) => {
    const { id } = data;
    const stmt = db.prepare('DELETE FROM notes WHERE id = ?');
    stmt.run(id);
    return { success: true };
  },
  zod$({
    id: z.coerce.number(),
  })
);

export default component$(() => {
  const notesSignal = useNotesLoader();
  const createAction = useCreateNoteAction();
  const deleteAction = useDeleteNoteAction();

  return (
    <div class="container">
      <header>
        <h1>Markdown Notes</h1>
      </header>

      <main>
        <section class="card">
          <h2>All Notes</h2>
          {notesSignal.value.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No notes yet. Create one below!</p>
          ) : (
            <div>
              {notesSignal.value.map((note) => (
                <div key={note.id} class="note-item">
                  <div class="note-title">
                    <a href={`/notes/${note.id}`}>{note.title}</a>
                  </div>
                  <Form action={deleteAction}>
                    <input type="hidden" name="id" value={note.id} />
                    <button type="submit" class="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
                      Delete
                    </button>
                  </Form>
                </div>
              ))}
            </div>
          )}
        </section>

        <section class="card">
          <h2>Create a New Note</h2>
          <Form action={createAction}>
            <div class="form-group">
              <label for="title">Title</label>
              <input
                type="text"
                id="title"
                name="title"
                placeholder="Enter note title..."
                value={(createAction.formData?.get('title') as string) || ''}
              />
              {createAction.value?.fieldErrors?.title && (
                <p class="error-message">{createAction.value.fieldErrors.title}</p>
              )}
            </div>

            <div class="form-group">
              <label for="content">Content (Markdown)</label>
              <textarea
                id="content"
                name="content"
                placeholder="Write your note content in Markdown..."
                value={(createAction.formData?.get('content') as string) || ''}
              ></textarea>
              {createAction.value?.fieldErrors?.content && (
                <p class="error-message">{createAction.value.fieldErrors.content}</p>
              )}
            </div>

            <button type="submit" class="btn btn-primary">
              Create Note
            </button>
          </Form>
        </section>
      </main>
    </div>
  );
});
