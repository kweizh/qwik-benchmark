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
import { getNote, updateNote } from "~/lib/db";

export const useEditNoteLoader = routeLoader$((requestEvent) => {
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

export const useUpdateNoteAction = routeAction$(
  (data, requestEvent) => {
    const id = Number(requestEvent.params.id);
    const note = updateNote(id, data.title.trim(), data.content.trim());

    if (!note) {
      throw requestEvent.error(404, "Note not found");
    }

    throw requestEvent.redirect(303, `/notes/${id}/`);
  },
  zod$({
    title: z.string().trim().min(1, "Title is required"),
    content: z.string().trim().min(1, "Content is required"),
  }),
);

export default component$(() => {
  const note = useEditNoteLoader();
  const updateAction = useUpdateNoteAction();

  const titleValue =
    updateAction.formData?.get("title")?.toString() ?? note.value.title;
  const contentValue =
    updateAction.formData?.get("content")?.toString() ?? note.value.content;

  return (
    <>
      <p>
        <Link href={`/notes/${note.value.id}/`}>&larr; Back to note</Link>
      </p>
      <h1>Edit note</h1>
      <Form action={updateAction}>
        <div>
          <label for="title">Title</label>
          <br />
          <input id="title" name="title" type="text" value={titleValue} />
        </div>
        <div>
          <label for="content">Content (Markdown)</label>
          <br />
          <textarea
            id="content"
            name="content"
            rows={8}
            cols={60}
            value={contentValue}
          />
        </div>

        {updateAction.value?.failed && (
          <div role="alert" style={{ color: "red" }}>
            {updateAction.value.fieldErrors?.title && (
              <p>{updateAction.value.fieldErrors.title}</p>
            )}
            {updateAction.value.fieldErrors?.content && (
              <p>{updateAction.value.fieldErrors.content}</p>
            )}
          </div>
        )}

        <button type="submit">Save changes</button>
      </Form>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const note = resolveValue(useEditNoteLoader);
  return {
    title: `Edit: ${note.title}`,
  };
};
