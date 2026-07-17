import type { RequestHandler } from "@builder.io/qwik-city";
import { insertImage } from "~/lib/db";
import { processUpload } from "~/lib/storage";

export const onPost: RequestHandler = async (requestEvent) => {
  const formData = await requestEvent.request.formData();
  const file = formData.get("image");

  if (!(file instanceof File) || file.size === 0) {
    throw requestEvent.error(400, "No image file was provided.");
  }

  const processed = await processUpload(file);

  insertImage({
    original_name: processed.originalName,
    original_path: processed.originalPath,
    optimized_path: processed.optimizedPath,
    width: processed.width,
    height: processed.height,
  });

  throw requestEvent.redirect(303, "/gallery");
};
