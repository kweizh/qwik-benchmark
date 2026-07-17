import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import type { DocumentHead } from "@builder.io/qwik-city";
import { getDb, type FileRecord } from "../../db";

export const useFiles = routeLoader$(async () => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM files").all() as FileRecord[];
  return rows;
});

export default component$(() => {
  const initialFiles = useFiles();
  const files = useSignal<FileRecord[]>(initialFiles.value);
  const message = useSignal("");
  const error = useSignal("");

  const loadFiles = $(async () => {
    try {
      const res = await fetch("/files/list");
      if (res.ok) {
        const data = await res.json();
        files.value = data;
      }
    } catch (err: any) {
      error.value = "Failed to load files";
    }
  });

  const handleUpload = $(async (e: Event) => {
    e.preventDefault();
    message.value = "";
    error.value = "";

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const res = await fetch("/files/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        message.value = "File uploaded successfully!";
        form.reset();
        await loadFiles();
      } else {
        const data = await res.json();
        error.value = data.error || "Upload failed";
      }
    } catch (err: any) {
      error.value = "Upload failed";
    }
  });

  const handleDelete = $(async (id: number) => {
    message.value = "";
    error.value = "";

    try {
      const res = await fetch(`/files/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        message.value = "File deleted successfully!";
        await loadFiles();
      } else {
        const data = await res.json();
        error.value = data.error || "Delete failed";
      }
    } catch (err: any) {
      error.value = "Delete failed";
    }
  });

  function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  return (
    <div>
      <h1>File Explorer</h1>

      {message.value && (
        <div style={{ color: "green", marginBottom: "10px" }}>{message.value}</div>
      )}
      {error.value && (
        <div style={{ color: "red", marginBottom: "10px" }}>{error.value}</div>
      )}

      <form id="upload-form" preventdefault:submit onSubmit$={handleUpload}>
        <div style={{ marginBottom: "10px" }}>
          <label>
            File:{" "}
            <input id="file-input" name="file" type="file" />
          </label>
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label>
            Tag:{" "}
            <input id="tag-input" name="tag" type="text" placeholder="e.g. documents, images" />
          </label>
        </div>
        <button type="submit">Upload</button>
      </form>

      <hr style={{ margin: "20px 0" }} />

      <h2>Uploaded Files</h2>
      <div id="file-list">
        {files.value.length === 0 && <p>No files uploaded yet.</p>}
        {files.value.map((file) => (
          <div
            key={file.id}
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              marginBottom: "10px",
              borderRadius: "4px",
            }}
          >
            <div>
              <strong>{file.name}</strong>
            </div>
            <div>Size: {formatSize(file.size)}</div>
            <div>MIME: {file.mime}</div>
            <div>Tag: {file.tag}</div>
            <button
              class="delete-btn"
              data-id={file.id}
              style={{ marginTop: "8px", color: "white", backgroundColor: "#e53e3e", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer" }}
              onClick$={$(() => handleDelete(file.id))}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "File Explorer",
};
