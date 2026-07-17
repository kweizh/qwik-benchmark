import type { RequestHandler } from "@builder.io/qwik-city";
import { processUploadedImage } from "../../../lib/imageProcessor";
import { insertImage } from "../../../lib/db";

export const onPost: RequestHandler = async ({ request, redirect }) => {
  let success = false;

  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (file && file instanceof Blob && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const originalName = (file as any).name || "uploaded-image";

      // Process the image
      const result = await processUploadedImage(buffer, originalName);

      // Save to DB
      insertImage({
        original_name: result.originalName,
        original_path: result.originalPath,
        optimized_path: result.optimizedPath,
        width: result.width,
        height: result.height,
      });

      success = true;
    }
  } catch (err: any) {
    console.error("Error uploading image:", err);
  }

  // Always redirect back to /gallery
  throw redirect(303, "/gallery");
};
