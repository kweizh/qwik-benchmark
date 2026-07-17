import { component$ } from "@builder.io/qwik";
import {
  Link,
  routeLoader$,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { getNote } from "~/lib/db";
import { renderMarkdown } from "~/lib/markdown";

/**
 * Server-side loader: fetch a single note by id and convert its
 * Markdown content to sanitized HTML. Returns 404 if the note does
 * not exist.
 */
export const useNoteLoader = routeLoader$(async (event) => {
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
    createdAt: note.created_at,
    updatedAt: note.updated_at,
    html: renderMarkdown(note.content),
  };
});

export default component$(() => {
  const noteSig = useNoteLoader();
  const note = noteSig.value;

  return (
    <article class="note-detail">
      <p class="back-link">
        <Link href="/notes">← All notes</Link>
      </p>
      <h1>{note.title}</h1>
      <p class="note-dates">
        <small>
          Created {note.createdAt} · last updated {note.updatedAt}
        </small>
      </p>
      <div class="note-actions">
        <Link href={`/notes/${note.id}/edit`} class="button">
          Edit
        </Link>
      </div>
      <div class="note-content" dangerouslySetInnerHTML={note.html} />
    </article>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const note = resolveValue(useNoteLoader);
  return {
    title: `${note.title} · Markdown Notes`,
    meta: [
      {
        name: "description",
        content: `Read the note "${note.title}".`,
      },
    ],
  };
};