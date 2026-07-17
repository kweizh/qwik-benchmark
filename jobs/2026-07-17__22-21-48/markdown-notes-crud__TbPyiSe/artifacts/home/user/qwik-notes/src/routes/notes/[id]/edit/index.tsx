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
import { getNote, updateNote } from "~/server/db";

/** Loads the existing note so the edit form can be pre-filled. */
export const useNote = routeLoader$(async (requestEvent) => {
  const id = Number(requestEvent.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw requestEvent.error(404, "Note not found");
  }
  const note = getNote(id);
  if (!note) {
    throw requestEvent.error(404, "Note not found");
  }
  return note;
});

/** Updates an existing note's title and Markdown content. */
export const useUpdateNote = routeAction$(
  async (data, requestEvent) => {
    const id = Number(requestEvent.params.id);
    const updated = updateNote(id, data);
    if (!updated) {
      return requestEvent.fail(404, { message: "Note not found" });
    }
    // After a successful update, send the user back to the detail page so the
    // new values are immediately visible. The routeLoader$ there re-runs and
    // reflects the persisted changes.
    throw requestEvent.redirect(308, `/notes/${id}`);
  },
  zod$({
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Content is required"),
  }),
);

export default component$(() => {
  const note = useNote();
  const updateAction = useUpdateNote();

  // Retain the user's submitted input when validation fails; otherwise fall
  // back to the persisted values so the form stays in sync with the database.
  const titleValue = updateAction.formData?.get("title") ?? note.value.title;
  const contentValue =
    updateAction.formData?.get("content") ?? note.value.content;

  return (
    <div class="layout">
      <nav class="nav">
        <Link href={`/notes/${note.value.id}`}>&larr; Back to note</Link>
        <Link href="/notes">All notes</Link>
      </nav>

      <section class="card">
        <h1>Edit note</h1>

        {updateAction.value?.failed && updateAction.value?.message && (
          <p class="flash">{updateAction.value.message}</p>
        )}

        <Form action={updateAction}>
          <div
            class={{
              "form-field": true,
              invalid: !!updateAction.value?.fieldErrors?.title,
            }}
          >
            <label for="title">Title</label>
            <input id="title" name="title" type="text" value={titleValue} />
            {updateAction.value?.fieldErrors?.title && (
              <p class="field-error">{updateAction.value.fieldErrors.title}</p>
            )}
          </div>

          <div
            class={{
              "form-field": true,
              invalid: !!updateAction.value?.fieldErrors?.content,
            }}
          >
            <label for="content">Content (Markdown)</label>
            <textarea id="content" name="content">
              {contentValue}
            </textarea>
            {updateAction.value?.fieldErrors?.content && (
              <p class="field-error">
                {updateAction.value.fieldErrors.content}
              </p>
            )}
          </div>

          <div class="form-actions">
            <button type="submit" class="primary">
              Save changes
            </button>
            <Link href={`/notes/${note.value.id}`} class="button">
              Cancel
            </Link>
          </div>
        </Form>
      </section>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Edit note",
};