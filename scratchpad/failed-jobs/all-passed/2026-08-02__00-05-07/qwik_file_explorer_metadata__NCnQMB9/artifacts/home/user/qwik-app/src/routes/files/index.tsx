import { $, component$, useSignal } from "@builder.io/qwik";
import { type DocumentHead, routeLoader$ } from "@builder.io/qwik-city";
import { listFiles } from "~/lib/db";

interface FileMeta {
  id: number;
  name: string;
  size: number;
  mime: string;
  tag: string;
}

// Loads the initial file list on the server so it's present in the
// server-rendered HTML (no client-side round trip needed on first paint).
export const useFilesLoader = routeLoader$<FileMeta[]>(() => {
  return listFiles();
});

export default component$(() => {
  const initialFiles = useFilesLoader();
  const files = useSignal<FileMeta[]>(initialFiles.value);
  const error = useSignal<string>("");
  const loading = useSignal<boolean>(false);

  const refresh = $(async () => {
    const res = await fetch("/files/list");
    if (res.ok) {
      files.value = (await res.json()) as FileMeta[];
    }
  });

  const handleSubmit = $(async (event: Event) => {
    event.preventDefault();
    error.value = "";

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    if (!(formData.get("file") instanceof File) || !(formData.get("file") as File).name) {
      error.value = "Please choose a file to upload.";
      return;
    }

    loading.value = true;
    try {
      const res = await fetch("/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Upload failed" }));
        error.value = body.error || "Upload failed";
        return;
      }

      form.reset();
      await refresh();
    } finally {
      loading.value = false;
    }
  });

  const handleDelete = $(async (id: number) => {
    error.value = "";
    const res = await fetch(`/files/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Delete failed" }));
      error.value = body.error || "Delete failed";
      return;
    }
    await refresh();
  });

  return (
    <>
      <h1>File Explorer</h1>

      <form id="upload-form" preventdefault:submit onSubmit$={handleSubmit}>
        <div>
          <label for="file-input">File</label>
          <input id="file-input" name="file" type="file" required />
        </div>
        <div>
          <label for="tag-input">Tag</label>
          <input
            id="tag-input"
            name="tag"
            type="text"
            placeholder="e.g. documents, images"
            required
          />
        </div>
        <button type="submit" disabled={loading.value}>
          {loading.value ? "Uploading..." : "Upload"}
        </button>
      </form>

      {error.value && <p style={{ color: "red" }}>{error.value}</p>}

      <div id="file-list">
        {files.value.length === 0 && <p>No files uploaded yet.</p>}
        {files.value.map((file) => (
          <div key={file.id} class="file-item" data-id={file.id}>
            <span class="file-name">{file.name}</span>{" "}
            <span class="file-size">{file.size} bytes</span>{" "}
            <span class="file-mime">{file.mime}</span>{" "}
            <span class="file-tag">{file.tag}</span>{" "}
            <button
              type="button"
              class="delete-btn"
              data-id={file.id}
              onClick$={() => handleDelete(file.id)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: "File Explorer",
  meta: [
    {
      name: "description",
      content: "Server-side file explorer with metadata stored in SQLite",
    },
  ],
};
