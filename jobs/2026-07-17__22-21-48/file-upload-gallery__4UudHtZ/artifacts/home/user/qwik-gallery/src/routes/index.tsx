import { component$, useComputed$ } from "@builder.io/qwik";
import {
  type DocumentHead,
  Form,
  routeAction$,
  routeLoader$,
  zod$,
  z,
} from "@builder.io/qwik-city";

// ============================================================================
// Constants shared between server and client (no Node APIs here).
// ============================================================================

const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MiB

// ============================================================================
// routeLoader$ — reads the uploads directory on the server and exposes the
// list of filenames to the component for rendering.
//
// All `node:fs` / `node:path` usage is confined to this server boundary via
// dynamic `import()` so the optimizer never drags Node modules into the
// browser bundle.
// ============================================================================

export const useImages = routeLoader$(async () => {
  const path = await import("node:path");
  const fs = await import("node:fs/promises");

  const uploadsDir = path.join(process.cwd(), "public", "uploads");

  await fs.mkdir(uploadsDir, { recursive: true });

  let names: string[] = [];
  try {
    const entries = await fs.readdir(uploadsDir, { withFileTypes: true });
    names = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch (err: any) {
    if (err && err.code !== "ENOENT") {
      throw err;
    }
  }

  return names.map((name) => ({
    name,
    src: `/uploads/${name}`,
  }));
});

// ============================================================================
// routeAction$ — receives the multipart/form-data submission, validates the
// file, and persists it to the local filesystem. Rejections are surfaced via
// the field-error mechanism and the file is never written to disk.
// ============================================================================

export const useUpload = routeAction$(
  async (data, { fail }) => {
    const path = await import("node:path");
    const fs = await import("node:fs/promises");

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    const file = data.image;

    if (!file || !(file instanceof File) || file.size === 0) {
      return fail(400, {
        fieldErrors: {
          image: "Please select an image file to upload.",
        },
      });
    }

    const filename = (file.name || "").toLowerCase();
    const ext = path.extname(filename);

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return fail(400, {
        fieldErrors: {
          image: `Files of type "${ext || "unknown"}" are not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
        },
      });
    }

    if (file.size > MAX_FILE_SIZE) {
      return fail(400, {
        fieldErrors: {
          image: `File is too large (${file.size} bytes). Maximum is ${MAX_FILE_SIZE} bytes (2 MiB).`,
        },
      });
    }

    // Read the file bytes and write them to disk.
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.mkdir(uploadsDir, { recursive: true });

    // Preserve the uploaded file's name. Use only the basename to avoid any
    // path-traversal via the supplied filename.
    const safeBase = path.basename(file.name);
    const dest = path.join(uploadsDir, safeBase);

    await fs.writeFile(dest, buffer);

    return {
      success: true,
      filename: safeBase,
    };
  },
  zod$({
    image: z.instanceof(File),
  }),
);

// ============================================================================
// UI component
// ============================================================================

export default component$(() => {
  const images = useImages();
  const action = useUpload();

  // The zod file validator widens `fieldErrors` into a union that also
  // contains sub-field keys (e.g. `image.type`), so narrow it explicitly.
  const fieldError = useComputed$(
    () =>
      (action.value?.fieldErrors as { image?: string } | undefined)?.image ??
      undefined,
  );

  return (
    <main style={{ "max-width": "960px", margin: "0 auto", padding: "1.5rem" }}>
      <h1>Image Gallery</h1>
      <p>
        Upload an image (PNG, JPG, JPEG, GIF, or WEBP) up to 2 MiB. Uploaded
        images are stored locally and shown below.
      </p>

      <Form action={action} enctype="multipart/form-data">
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            type="file"
            name="image"
            accept="image/png,image/jpeg,image/gif,image/webp"
            required
          />
          <button type="submit">Upload</button>
        </div>
      </Form>

      {fieldError.value && (
        <p role="alert" style={{ color: "crimson", "margin-top": "0.75rem" }}>
          {fieldError.value}
        </p>
      )}

      {action.value?.success && (
        <p style={{ color: "green", "margin-top": "0.75rem" }}>
          Uploaded {action.value.filename}.
        </p>
      )}

      <hr style={{ margin: "1.5rem 0" }} />

      <h2>Gallery</h2>
      {images.value.length === 0 ? (
        <p>No images uploaded yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            "grid-template-columns": "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "1rem",
          }}
        >
          {images.value.map((img) => (
            <figure
              key={img.name}
              style={{ margin: 0, display: "flex", "flex-direction": "column" }}
            >
              <img
                src={img.src}
                alt={img.name}
                width={300}
                height={180}
                style={{
                  width: "100%",
                  height: "180px",
                  "object-fit": "cover",
                  border: "1px solid #ccc",
                  "border-radius": "4px",
                }}
              />
              <figcaption
                style={{
                  "font-size": "0.8rem",
                  "margin-top": "0.25rem",
                  "word-break": "break-all",
                }}
              >
                {img.name}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </main>
  );
});

export const head: DocumentHead = {
  title: "Image Gallery",
  meta: [
    {
      name: "description",
      content: "Upload and browse images stored locally.",
    },
  ],
};