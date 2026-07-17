import { component$ } from "@builder.io/qwik";
import {
  routeAction$,
  routeLoader$,
  Form,
  z,
  zod$,
} from "@builder.io/qwik-city";
import type { DocumentHead } from "@builder.io/qwik-city";

const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MiB

export const useUploadedImages = routeLoader$(async () => {
  const { readdir } = await import("node:fs/promises");
  const { join } = await import("node:path");

  const uploadsDir = join(process.cwd(), "public", "uploads");

  try {
    const entries = await readdir(uploadsDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [] as string[];
  }
});

export const useUploadImage = routeAction$(
  async (data, requestEvent) => {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const { join, extname } = await import("node:path");

    const file = data.image as unknown as File;

    if (!file || typeof file === "string" || !("arrayBuffer" in file)) {
      return requestEvent.fail(400, {
        message: "No file was uploaded.",
        fieldErrors: { image: "Please choose a file to upload." },
      });
    }

    const originalName = file.name || "upload";
    const ext = extname(originalName).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return requestEvent.fail(400, {
        message: "Invalid file type.",
        fieldErrors: {
          image: `Unsupported file type "${ext || "unknown"}". Allowed types: ${ALLOWED_EXTENSIONS.join(", ")}.`,
        },
      });
    }

    if (file.size > MAX_FILE_SIZE) {
      return requestEvent.fail(400, {
        message: "File too large.",
        fieldErrors: {
          image: `File is too large. Maximum allowed size is ${MAX_FILE_SIZE} bytes (2 MiB).`,
        },
      });
    }

    const uploadsDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const destPath = join(uploadsDir, originalName);

    await writeFile(destPath, buffer);

    return {
      success: true,
      fileName: originalName,
    };
  },
  zod$({
    image: z.instanceof(Blob),
  }),
);

export default component$(() => {
  const uploadedImages = useUploadedImages();
  const uploadAction = useUploadImage();

  return (
    <>
      <h1>Image Upload Gallery</h1>

      <Form action={uploadAction} enctype="multipart/form-data">
        <input type="file" name="image" accept="image/*" />
        <button type="submit">Upload</button>

        {uploadAction.value?.failed && (
          <p style={{ color: "red" }}>
            {(uploadAction.value as { message?: string }).message ??
              "Upload failed."}
          </p>
        )}
      </Form>

      <section>
        <h2>Gallery</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "1rem",
          }}
        >
          {uploadedImages.value.map((fileName) => (
            <img
              key={fileName}
              src={`/uploads/${fileName}`}
              alt={fileName}
              style={{ width: "100%", height: "auto", objectFit: "cover" }}
            />
          ))}
        </div>
      </section>
    </>
  );
});

export const head: DocumentHead = {
  title: "Welcome to Qwik",
  meta: [
    {
      name: "description",
      content: "Qwik site description",
    },
  ],
};
