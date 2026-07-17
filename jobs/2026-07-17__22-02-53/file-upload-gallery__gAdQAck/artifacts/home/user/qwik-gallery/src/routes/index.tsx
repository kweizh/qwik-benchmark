import { component$ } from "@builder.io/qwik";
import { routeAction$, routeLoader$, Form } from "@builder.io/qwik-city";
import type { DocumentHead } from "@builder.io/qwik-city";

export const useUploadsLoader = routeLoader$(async () => {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const uploadsDir = path.join(process.cwd(), "public", "uploads");

  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    const files = await fs.readdir(uploadsDir);

    const allowedExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
    
    // Read stats to sort by modification time (newest first)
    const filesWithStats = await Promise.all(
      files.map(async (fileName) => {
        const filePath = path.join(uploadsDir, fileName);
        const stats = await fs.stat(filePath);
        return { name: fileName, mtime: stats.mtimeMs };
      })
    );

    const imageFiles = filesWithStats
      .filter((f) => allowedExtensions.includes(path.extname(f.name).toLowerCase()))
      .sort((a, b) => b.mtime - a.mtime)
      .map((f) => f.name);

    return imageFiles;
  } catch (error) {
    console.error("Error reading uploads directory:", error);
    return [];
  }
});

export const useUploadAction = routeAction$(async (data, { fail }) => {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");

  const file = data.image as any;

  // 1. Check if a file is provided and is a Blob
  if (!file || typeof file === "string" || !(file instanceof Blob)) {
    return fail(400, {
      fieldErrors: {
        image: "Please select an image file to upload.",
      },
    });
  }

  // 2. Check if the file name is empty or size is 0 (empty input submission)
  const fileName = (file as any).name;
  if (!fileName || file.size === 0) {
    return fail(400, {
      fieldErrors: {
        image: "Please select a valid image file.",
      },
    });
  }

  // 3. Validate file size (max 2 MiB = 2097152 bytes)
  if (file.size > 2097152) {
    return fail(400, {
      fieldErrors: {
        image: "File size must be less than 2 MiB (2,097,152 bytes).",
      },
    });
  }

  // 4. Validate file extension
  const ext = path.extname(fileName).toLowerCase();
  const allowedExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
  if (!allowedExtensions.includes(ext)) {
    return fail(400, {
      fieldErrors: {
        image: "Only image uploads with extensions .png, .jpg, .jpeg, .gif, or .webp are accepted.",
      },
    });
  }

  // 5. Validate MIME type
  const allowedMimeTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
  if (!allowedMimeTypes.includes(file.type.toLowerCase())) {
    return fail(400, {
      fieldErrors: {
        image: "Invalid file type. Only image uploads of type PNG, JPEG, GIF, or WEBP are accepted.",
      },
    });
  }

  // 6. Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  try {
    await fs.mkdir(uploadsDir, { recursive: true });

    // 7. Write file to disk, preserving the uploaded file's name
    const filePath = path.join(uploadsDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    return {
      success: true,
      fileName,
    };
  } catch (error: any) {
    console.error("Error saving uploaded file:", error);
    return fail(500, {
      fieldErrors: {
        image: `Failed to save file: ${error.message || error}`,
      },
    });
  }
});

export default component$(() => {
  const uploads = useUploadsLoader();
  const uploadAction = useUploadAction();

  return (
    <div class="container">
      <header>
        <h1>Image Upload Gallery</h1>
        <p class="subtitle">Upload your images and view them instantly in the gallery below.</p>
      </header>

      <div class="card">
        <Form action={uploadAction} enctype="multipart/form-data">
          <div class="form-group">
            <label for="image" class="form-label">
              Select an Image File (Max 2 MiB)
            </label>
            <div class="file-input-wrapper">
              <input
                type="file"
                name="image"
                id="image"
                class="file-input"
                accept=".png,.jpg,.jpeg,.gif,.webp"
                required
              />
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
              Supported formats: PNG, JPG, JPEG, GIF, WEBP
            </p>
          </div>

          {uploadAction.value?.fieldErrors?.image && (
            <div class="alert alert-error" role="alert">
              {uploadAction.value.fieldErrors.image}
            </div>
          )}

          {uploadAction.value?.success && (
            <div class="alert alert-success" role="alert">
              Successfully uploaded "{uploadAction.value.fileName}"!
            </div>
          )}

          <button type="submit" class="btn" disabled={uploadAction.isRunning}>
            {uploadAction.isRunning ? "Uploading..." : "Upload Image"}
          </button>
        </Form>
      </div>

      <section>
        <h2 class="gallery-title">Gallery</h2>
        
        {uploads.value.length === 0 ? (
          <div class="empty-state">
            <h3>No images uploaded yet</h3>
            <p>Select a file above and click "Upload Image" to start your gallery.</p>
          </div>
        ) : (
          <div class="gallery-grid">
            {uploads.value.map((fileName) => (
              <div key={fileName} class="gallery-item">
                <div class="gallery-img-wrapper">
                  <img
                    src={`/uploads/${fileName}`}
                    alt={fileName}
                    class="gallery-img"
                    loading="lazy"
                    width={300}
                    height={225}
                  />
                </div>
                <div class="gallery-meta" title={fileName}>
                  {fileName}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Image Upload Gallery",
  meta: [
    {
      name: "description",
      content: "Simple self-contained image upload gallery using Qwik City",
    },
  ],
};
