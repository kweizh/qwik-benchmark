import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';

interface FileMetadata {
  id: number;
  name: string;
  size: number;
  mime: string;
  tag: string;
}

export default component$(() => {
  const files = useSignal<FileMetadata[]>([]);
  const errorMessage = useSignal<string>('');

  const fetchFiles = $(async () => {
    try {
      const res = await fetch('/files/list');
      if (res.ok) {
        files.value = await res.json();
      } else {
        errorMessage.value = 'Failed to load files.';
      }
    } catch (err: any) {
      errorMessage.value = err.message || 'Failed to load files.';
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    await fetchFiles();
  });

  const onSubmit = $(async (e: Event) => {
    errorMessage.value = '';
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const res = await fetch('/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const newFile = await res.json();
        files.value = [...files.value, newFile];
        form.reset();
      } else {
        const err = await res.json();
        errorMessage.value = err.error || 'Upload failed';
      }
    } catch (err: any) {
      errorMessage.value = err.message || 'Upload failed';
    }
  });

  const handleDelete = $(async (id: number) => {
    errorMessage.value = '';
    try {
      const res = await fetch(`/files/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        files.value = files.value.filter((file) => file.id !== id);
      } else {
        const err = await res.json();
        errorMessage.value = err.error || 'Deletion failed';
      }
    } catch (err: any) {
      errorMessage.value = err.message || 'Deletion failed';
    }
  });

  return (
    <div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: sans-serif;">
      <h1>Server-Side File Explorer</h1>

      <div style="background: #f4f4f4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2>Upload New File</h2>
        <form id="upload-form" preventdefault:submit onSubmit$={onSubmit}>
          <div style="margin-bottom: 10px;">
            <label for="file-input" style="display: block; margin-bottom: 5px; font-weight: bold;">File:</label>
            <input type="file" id="file-input" name="file" required style="width: 100%; padding: 8px; box-sizing: border-box;" />
          </div>
          <div style="margin-bottom: 15px;">
            <label for="tag-input" style="display: block; margin-bottom: 5px; font-weight: bold;">Tag:</label>
            <input type="text" id="tag-input" name="tag" placeholder="e.g., documents, images" required style="width: 100%; padding: 8px; box-sizing: border-box;" />
          </div>
          <button type="submit" style="background: #0070f3; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; font-size: 16px;">
            Upload File
          </button>
        </form>
      </div>

      {errorMessage.value && (
        <div style="background: #fee; color: #c00; padding: 10px; border-radius: 4px; margin-bottom: 20px; border: 1px solid #fcc;">
          {errorMessage.value}
        </div>
      )}

      <h2>Uploaded Files</h2>
      <div id="file-list">
        {files.value.length === 0 ? (
          <p style="color: #666; font-style: italic;">No files uploaded yet.</p>
        ) : (
          files.value.map((file) => (
            <div
              key={file.id}
              style="background: white; border: 1px solid #ddd; padding: 15px; border-radius: 6px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);"
            >
              <div>
                <h3 style="margin: 0 0 8px 0; color: #333;">{file.name}</h3>
                <p style="margin: 4px 0; font-size: 14px; color: #555;">
                  <strong>Size:</strong> {file.size} bytes
                </p>
                <p style="margin: 4px 0; font-size: 14px; color: #555;">
                  <strong>MIME:</strong> {file.mime}
                </p>
                <p style="margin: 4px 0; font-size: 14px; color: #555;">
                  <strong>Tag:</strong> <span style="background: #eef2f6; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-weight: bold; color: #475569;">{file.tag}</span>
                </p>
              </div>
              <button
                class="delete-btn"
                data-id={file.id}
                onClick$={$(() => handleDelete(file.id))}
                style="background: #dc2626; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 14px;"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
});
