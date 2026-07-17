import type { RequestHandler } from "@builder.io/qwik-city";
import { getDb } from "../../../lib/db";
import { saveAndOptimizeImage } from "../../../lib/image-optimizer";

export const onPost: RequestHandler = async ({ request, redirect }) => {
  const formData = await request.formData();
  const file = formData.get("image") as File | null;

  if (!file || !(file instanceof File) || file.size === 0) {
    throw redirect(303, "/gallery");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const originalName = file.name || "unknown";

  const result = await saveAndOptimizeImage(buffer, originalName);

  const db = getDb();
  db.prepare(
    "INSERT INTO images (original_name, original_path, optimized_path, width, height) VALUES (?, ?, ?, ?, ?)"
  ).run(result.originalName, result.originalPath, result.optimizedPath, result.width, result.height);

  throw redirect(303, "/gallery");
};
