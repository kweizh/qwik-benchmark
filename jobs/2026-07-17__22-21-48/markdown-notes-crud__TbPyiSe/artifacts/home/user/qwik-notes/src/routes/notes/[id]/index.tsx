import { component$ } from "@builder.io/qwik";
import {
  routeLoader$,
  Link,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { getNote } from "~/server/db";
import { renderMarkdown } from "~/server/markdown";

/** Loads a single note and renders its Markdown content to sanitized HTML. */
export const useNote = routeLoader$(async (requestEvent) => {
  const id = Number(requestEvent.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw requestEvent.error(404, "Note not found");
  }

  const note = getNote(id);
  if (!note) {
    throw requestEvent.error(404, "Note not found");
  }

  const html = await renderMarkdown(note.content);
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    html,
    created_at: note.created_at,
    updated_at: note.updated_at,
  };
});

export default component$(() => {
  const note = useNote();

  return (
    <div class="layout">
      <nav class="nav">
        <Link href="/notes">&larr; Back to notes</Link>
        <Link href={`/notes/${note.value.id}/edit`}>Edit</Link>
      </nav>

      <article class="card">
        <h1>{note.value.title}</h1>
        <p class="note-meta">
          Created {new Date(note.value.created_at).toLocaleString()}
          {note.value.updated_at !== note.value.created_at && (
            <>
              {" · Updated "}
              {new Date(note.value.updated_at).toLocaleString()}
            </>
          )}
        </p>

        {/* The HTML was sanitized server-side with rehype-sanitize, so it is
            safe to render here. <script> tags and other unsafe content are
            stripped before this point. */}
        <div
          class="prose"
          dangerouslySetInnerHTML={note.value.html}
        />
      </article>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Note",
};