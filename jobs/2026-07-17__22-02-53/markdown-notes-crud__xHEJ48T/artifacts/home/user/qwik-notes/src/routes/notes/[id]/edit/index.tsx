import { component$ } from '@builder.io/qwik';
import { routeLoader$, routeAction$, zod$, z, Form } from '@builder.io/qwik-city';
import db, { type Note } from '../../../../db';

export const useNoteLoader = routeLoader$(async ({ params, status }) => {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    status(404);
    return null;
  }

  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as Note | undefined;
  if (!note) {
    status(404);
    return null;
  }

  return note;
});

export const useUpdateNoteAction = routeAction$(
  async (data, { params, redirect }) => {
    const id = parseInt(params.id, 10);
    const { title, content } = data;
    const stmt = db.prepare('UPDATE notes SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(title, content, id);
    throw redirect(303, `/notes/${id}`);
  },
  zod$({
    title: z.string().trim().min(1, 'Title cannot be blank'),
    content: z.string().trim().min(1, 'Content cannot be blank'),
  })
);

export default component$(( ) => {
  const noteSignal = useNoteLoader();
  const updateAction = useUpdateNoteAction();

  if (!noteSignal.value) {
    return (
      <div class="container">
        <header>
          <h1>Note Not Found</h1>
        </header>
        <main class="card">
          <p style={{ color: 'var(--danger-color)' }}>The requested note does not exist.</p>
          <a href="/notes">← Back to Notes</a>
        </main>
      </div>
    );
  }

  const currentTitle = updateAction.formData
    ? (updateAction.formData.get('title') as string || '')
    : noteSignal.value.title;

  const currentContent = updateAction.formData
    ? (updateAction.formData.get('content') as string || '')
    : noteSignal.value.content;

  return (
    <div class="container">
      <header>
        <h1>Edit Note</h1>
        <a href={`/notes/${noteSignal.value.id}`} class="btn" style={{ border: '1px solid var(--border-color)', padding: '0.5rem 1rem' }}>
          Cancel
        </a>
      </header>

      <main class="card">
        <Form action={updateAction}>
          <div class="form-group">
            <label for="title">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={currentTitle}
              placeholder="Enter note title..."
            />
            {updateAction.value?.fieldErrors?.title && (
              <p class="error-message">{updateAction.value.fieldErrors.title}</p>
            )}
          </div>

          <div class="form-group">
            <label for="content">Content (Markdown)</label>
            <textarea
              id="content"
              name="content"
              value={currentContent}
              placeholder="Write your note content in Markdown..."
            ></textarea>
            {updateAction.value?.fieldErrors?.content && (
              <p class="error-message">{updateAction.value.fieldErrors.content}</p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" class="btn btn-primary">
              Save Changes
            </button>
            <a href={`/notes/${noteSignal.value.id}`} class="btn" style={{ border: '1px solid var(--border-color)' }}>
              Discard
            </a>
          </div>
        </Form>
      </main>
    </div>
  );
});
