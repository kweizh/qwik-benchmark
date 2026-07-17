import { component$ } from "@builder.io/qwik";
import { routeLoader$, Link, type DocumentHead } from "@builder.io/qwik-city";
import { getNote } from "~/lib/db";
import { renderMarkdownToSafeHtml } from "~/lib/markdown";

export const useNoteLoader = routeLoader$((requestEvent) => {
  const id = Number(requestEvent.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    throw requestEvent.error(404, "Note not found");
  }

  const note = getNote(id);

  if (!note) {
    throw requestEvent.error(404, "Note not found");
  }

  return {
    id: note.id,
    title: note.title,
    content: note.content,
    html: renderMarkdownToSafeHtml(note.content),
    createdAt: note.created_at,
    updatedAt: note.updated_at,
  };
});

export default component$(() => {
  const note = useNoteLoader();

  return (
    <>
      <p>
        <Link href="/notes/">&larr; Back to all notes</Link>
      </p>
      <h1>{note.value.title}</h1>
      <p>
        <Link href={`/notes/${note.value.id}/edit/`}>Edit this note</Link>
      </p>
      <article dangerouslySetInnerHTML={note.value.html} />
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const note = resolveValue(useNoteLoader);
  return {
    title: note.title,
  };
};
