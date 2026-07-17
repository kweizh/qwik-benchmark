import { component$, useStore, useVisibleTask$, $ } from "@builder.io/qwik";

export interface UploadedFile {
  id: number;
  name: string;
  size: number;
  mime: string;
  tag: string;
}

export default component$(() => {
  const state = useStore({
    files: [] as UploadedFile[],
    errorMessage: "",
    successMessage: "",
  });

  const fetchFiles = $(async () => {
    try {
      const response = await fetch("/files/list");
      if (response.ok) {
        state.files = await response.json();
      } else {
        state.errorMessage = "Failed to load files";
      }
    } catch (err: any) {
      state.errorMessage = err.message || "Failed to load files";
    }
  });

  // Fetch files on mount
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    fetchFiles();
  });

  const handleUpload = $(async (e: SubmitEvent) => {
    state.errorMessage = "";
    state.successMessage = "";

    const form = e.target as HTMLFormElement;
    const fileInput = form.querySelector("#file-input") as HTMLInputElement;
    const tagInput = form.querySelector("#tag-input") as HTMLInputElement;

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      state.errorMessage = "Please select a file to upload.";
      return;
    }

    if (!tagInput || !tagInput.value.trim()) {
      state.errorMessage = "Please provide a tag.";
      return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    formData.append("tag", tagInput.value.trim());

    try {
      const response = await fetch("/files/upload", {
        method: "POST",
        body: formData,
      });

      if (response.status === 201) {
        state.successMessage = "File uploaded successfully!";
        form.reset();
        await fetchFiles();
      } else {
        const errData = await response.json();
        state.errorMessage = errData.error || "Upload failed";
      }
    } catch (err: any) {
      state.errorMessage = err.message || "An error occurred during upload.";
    }
  });

  const handleDelete = $(async (id: number) => {
    state.errorMessage = "";
    state.successMessage = "";

    try {
      const response = await fetch(`/files/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        state.successMessage = "File deleted successfully!";
        await fetchFiles();
      } else {
        const errData = await response.json();
        state.errorMessage = errData.error || "Deletion failed";
      }
    } catch (err: any) {
      state.errorMessage = err.message || "An error occurred during deletion.";
    }
  });

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Server-Side File Explorer</h1>

      {state.errorMessage && (
        <div style={{ color: "red", marginBottom: "15px" }}>
          {state.errorMessage}
        </div>
      )}
      {state.successMessage && (
        <div style={{ color: "green", marginBottom: "15px" }}>
          {state.successMessage}
        </div>
      )}

      <form
        id="upload-form"
        preventdefault:submit
        onSubmit$={handleUpload}
        style={{ marginBottom: "30px" }}
      >
        <div style={{ marginBottom: "10px" }}>
          <label for="file-input" style={{ display: "block", fontWeight: "bold" }}>File:</label>
          <input id="file-input" name="file" type="file" required />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label for="tag-input" style={{ display: "block", fontWeight: "bold" }}>Tag:</label>
          <input id="tag-input" name="tag" type="text" required placeholder="e.g., documents" />
        </div>
        <button type="submit">Upload File</button>
      </form>

      <h2>Uploaded Files</h2>
      <div id="file-list">
        {state.files.length === 0 ? (
          <p>No files uploaded yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ccc", textAlign: "left" }}>
                <th style={{ padding: "8px" }}>Name</th>
                <th style={{ padding: "8px" }}>Size (bytes)</th>
                <th style={{ padding: "8px" }}>MIME Type</th>
                <th style={{ padding: "8px" }}>Tag</th>
                <th style={{ padding: "8px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.files.map((file) => (
                <tr key={file.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px" }}>{file.name}</td>
                  <td style={{ padding: "8px" }}>{file.size}</td>
                  <td style={{ padding: "8px" }}>{file.mime}</td>
                  <td style={{ padding: "8px" }}>{file.tag}</td>
                  <td style={{ padding: "8px" }}>
                    <button
                      class="delete-btn"
                      data-id={file.id}
                      onClick$={() => handleDelete(file.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
});
