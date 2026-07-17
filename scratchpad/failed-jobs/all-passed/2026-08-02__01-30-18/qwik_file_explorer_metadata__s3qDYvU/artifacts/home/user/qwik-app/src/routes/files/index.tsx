import { component$, useStore, useVisibleTask$, $ } from "@builder.io/qwik";

interface FileItem {
  id: number;
  name: string;
  size: number;
  mime: string;
  tag: string;
}

export default component$(() => {
  const state = useStore<{ files: FileItem[] }>({
    files: [],
  });

  const fetchFiles = $(async () => {
    try {
      const res = await fetch("/files/list");
      if (res.ok) {
        state.files = await res.json();
      }
    } catch (err) {
      console.error("Error fetching files:", err);
    }
  });

  useVisibleTask$(() => {
    fetchFiles();
  });

  const handleSubmit = $(async (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const res = await fetch("/files/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        form.reset();
        await fetchFiles();
      } else {
        const errData = await res.json();
        alert(errData.error || "Upload failed");
      }
    } catch (err) {
      console.error("Error uploading file:", err);
    }
  });

  const handleDelete = $(async (id: number) => {
    try {
      const res = await fetch(`/files/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchFiles();
      } else {
        const errData = await res.json();
        alert(errData.error || "Deletion failed");
      }
    } catch (err) {
      console.error("Error deleting file:", err);
    }
  });

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>File Explorer</h1>

      <form id="upload-form" onSubmit$={handleSubmit} style={{ marginBottom: "20px" }}>
        <div style={{ marginBottom: "10px" }}>
          <label htmlFor="file-input" style={{ display: "block", marginBottom: "5px" }}>File:</label>
          <input type="file" id="file-input" name="file" required />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label htmlFor="tag-input" style={{ display: "block", marginBottom: "5px" }}>Tag:</label>
          <input type="text" id="tag-input" name="tag" placeholder="e.g., documents, images" required />
        </div>
        <button type="submit">Upload</button>
      </form>

      <h2>Uploaded Files</h2>
      <div id="file-list">
        {state.files.length === 0 ? (
          <p>No files uploaded yet.</p>
        ) : (
          <ul style={{ listStyleType: "none", padding: 0 }}>
            {state.files.map((file) => (
              <li key={file.id} style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "10px", borderRadius: "4px" }}>
                <div><strong>Name:</strong> {file.name}</div>
                <div><strong>Size:</strong> {file.size} bytes</div>
                <div><strong>MIME:</strong> {file.mime}</div>
                <div><strong>Tag:</strong> {file.tag}</div>
                <button
                  class="delete-btn"
                  data-id={file.id}
                  onClick$={() => handleDelete(file.id)}
                  style={{ marginTop: "5px", backgroundColor: "#ff4d4d", color: "#fff", border: "none", padding: "5px 10px", borderRadius: "3px", cursor: "pointer" }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});
