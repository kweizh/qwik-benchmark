import { component$, useStore, useVisibleTask$, $ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import db from "../../db";

export interface FileItem {
  id: number;
  name: string;
  size: number;
  mime: string;
  tag: string;
}

export const useFilesLoader = routeLoader$(async () => {
  try {
    const files = db.prepare("SELECT * FROM files").all() as FileItem[];
    return files;
  } catch {
    return [];
  }
});

export default component$(() => {
  const initialFiles = useFilesLoader();
  const state = useStore<{ files: FileItem[] }>({
    files: initialFiles.value || [],
  });

  // Keep state in sync or fetch on mount to make sure it's always up to date
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      const res = await fetch("/files/list");
      if (res.ok) {
        state.files = await res.json();
      }
    } catch {
      console.error("Failed to load files");
    }
  });

  const handleUpload = $(async (e: SubmitEvent) => {
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const fileInput = form.querySelector("#file-input") as HTMLInputElement;
    const tagInput = form.querySelector("#tag-input") as HTMLInputElement;

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      alert("Please select a file to upload.");
      return;
    }

    if (!tagInput || !tagInput.value.trim()) {
      alert("Please provide a tag.");
      return;
    }

    try {
      const res = await fetch("/files/upload", {
        method: "POST",
        body: formData,
      });

      if (res.status === 201) {
        const newFile = await res.json();
        state.files = [...state.files, newFile];
        form.reset();
      } else {
        const errData = await res.json();
        alert(`Upload failed: ${errData.error || "Unknown error"}`);
      }
    } catch {
      alert("An error occurred during upload.");
    }
  });

  const handleDelete = $(async (id: number) => {
    try {
      const res = await fetch(`/files/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        state.files = state.files.filter((f) => f.id !== id);
      } else {
        const errData = await res.json();
        alert(`Deletion failed: ${errData.error || "Unknown error"}`);
      }
    } catch {
      alert("An error occurred during deletion.");
    }
  });

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Server-Side File Explorer</h1>

      <div style={{ marginBottom: "30px" }}>
        <h2>Upload New File</h2>
        <form id="upload-form" preventdefault:submit onSubmit$={handleUpload}>
          <div style={{ marginBottom: "10px" }}>
            <label for="file-input" style={{ display: "block", fontWeight: "bold" }}>
              File:
            </label>
            <input
              id="file-input"
              name="file"
              type="file"
              required
              style={{ marginTop: "5px" }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label for="tag-input" style={{ display: "block", fontWeight: "bold" }}>
              Tag:
            </label>
            <input
              id="tag-input"
              name="tag"
              type="text"
              required
              placeholder="e.g., documents, images"
              style={{ marginTop: "5px", padding: "5px", width: "250px" }}
            />
          </div>

          <button type="submit" style={{ padding: "8px 15px", cursor: "pointer" }}>
            Upload File
          </button>
        </form>
      </div>

      <hr />

      <div>
        <h2>Uploaded Files</h2>
        <div id="file-list">
          {state.files.length === 0 ? (
            <p>No files uploaded yet.</p>
          ) : (
            <ul style={{ listStyleType: "none", padding: 0 }}>
              {state.files.map((file) => (
                <li
                  key={file.id}
                  style={{
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    padding: "10px",
                    marginBottom: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong>Name:</strong> {file.name} <br />
                    <strong>Size:</strong> {file.size} bytes <br />
                    <strong>MIME:</strong> {file.mime} <br />
                    <strong>Tag:</strong> {file.tag}
                  </div>
                  <button
                    class="delete-btn"
                    data-id={file.id}
                    onClick$={() => handleDelete(file.id)}
                    style={{
                      backgroundColor: "#ff4d4d",
                      color: "white",
                      border: "none",
                      padding: "8px 12px",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
});
