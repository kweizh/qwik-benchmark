import { component$ } from "@builder.io/qwik";
import {
  Form,
  routeAction$,
  routeLoader$,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const UPLOADS_DIR = join(process.cwd(), "public", "uploads");
const MAX_SIZE = 2 * 1024 * 1024; // 2 MiB
const ALLOWED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
]);

function getExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx).toLowerCase();
}

export const useImagesLoader = routeLoader$(async () => {
  try {
    await mkdir(UPLOADS_DIR, { recursive: true });
    const entries = await readdir(UPLOADS_DIR);
    return entries
      .filter((name) => ALLOWED_EXTENSIONS.has(getExtension(name)))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
});

export const useUploadAction = routeAction$(async (data, event) => {
  const maybeFile = data.image as unknown;

  if (
    !maybeFile ||
    typeof maybeFile !== "object" ||
    typeof (maybeFile as { arrayBuffer?: unknown }).arrayBuffer !== "function"
  ) {
    return event.fail(400, {
      fieldErrors: {
        image: "Please choose an image file to upload.",
      },
    });
  }

  const file = maybeFile as File;
  const name = file.name || "";
  const size = typeof file.size === "number" ? file.size : 0;
  const ext = getExtension(name);

  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return event.fail(400, {
      fieldErrors: {
        image: "Only PNG, JPG, JPEG, GIF and WEBP images are accepted.",
      },
    });
  }

  if (size <= 0) {
    return event.fail(400, {
      fieldErrors: {
        image: "The uploaded file is empty.",
      },
    });
  }

  if (size > MAX_SIZE) {
    return event.fail(400, {
      fieldErrors: {
        image: "File is too large. Maximum size is 2 MiB.",
      },
    });
  }

  await mkdir(UPLOADS_DIR, { recursive: true });
  const bytes = new Uint8Array(await file.arrayBuffer());
  await writeFile(join(UPLOADS_DIR, name), bytes);

  return {
    success: true,
    filename: name,
  };
});

export default component$(() => {
  const images = useImagesLoader();
  const action = useUploadAction();

  const errorMessage = action.value?.failed
    ? (action.value.fieldErrors?.image as string | undefined)
    : undefined;
  const successMessage = action.value?.success
    ? `Uploaded "${action.value.filename}" successfully.`
    : undefined;

  return (
    <main class="page">
      <h1>Image Upload Gallery</h1>

      <section class="upload">
        <Form
          action={action}
          enctype="multipart/form-data"
          class="upload-form"
        >
          <label class="upload-label">
            <span>Choose an image to upload</span>
            <input
              type="file"
              name="image"
              accept="image/png,image/jpeg,image/gif,image/webp"
              required
            />
          </label>
          {errorMessage ? (
            <p class="error" role="alert">
              {errorMessage}
            </p>
          ) : null}
          {successMessage ? (
            <p class="success" role="status">
              {successMessage}
            </p>
          ) : null}
          <button type="submit" disabled={action.isRunning}>
            {action.isRunning ? "Uploading…" : "Upload"}
          </button>
        </Form>
      </section>

      <section class="gallery">
        <h2>
          Gallery <span class="count">({images.value.length})</span>
        </h2>
        {images.value.length === 0 ? (
          <p class="empty">No images uploaded yet.</p>
        ) : (
          <div class="grid">
            {images.value.map((filename) => (
              <figure key={filename} class="card">
                <img
                  src={`/uploads/${filename}`}
                  alt={filename}
                  width={200}
                  height={200}
                  loading="lazy"
                />
                <figcaption>{filename}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>
    </main>
  );
});

export const head: DocumentHead = {
  title: "Image Upload Gallery",
  meta: [
    {
      name: "description",
      content: "Upload images and view them in a gallery.",
    },
  ],
};