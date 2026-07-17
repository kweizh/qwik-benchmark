import { component$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import db, { type Note } from '../../../db';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

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

  const rawHtml = await marked.parse(note.content);
  const sanitizedHtml = sanitizeHtml(rawHtml);

  return {
    title: note.title,
    content: note.content,
    html: sanitizedHtml,
    created_at: note.created_at,
    updated_at: note.updated_at,
    id: note.id,
  };
});

export default component$(() => {
  const noteSignal = useNoteLoader();

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

  return (
    <div class="container">
      <header>
        <h1>{noteSignal.value.title}</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <a href={`/notes/${noteSignal.value.id}/edit`} class="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
            Edit
          </a>
          <a href="/notes" class="btn" style={{ border: '1px solid var(--border-color)', padding: '0.5rem 1rem' }}>
            Back to List
          </a>
        </div>
      </header>

      <main class="card">
        <div class="note-meta">
          Created: {new Date(noteSignal.value.created_at).toLocaleString()} | 
          Updated: {new Date(noteSignal.value.updated_at).toLocaleString()}
        </div>
        <hr style={{ borderColor: 'var(--border-color)', margin: '1rem 0' }} />
        <div class="markdown-content" dangerouslySetInnerHTML={noteSignal.value.html}></div>
      </main>
    </div>
  );
});
