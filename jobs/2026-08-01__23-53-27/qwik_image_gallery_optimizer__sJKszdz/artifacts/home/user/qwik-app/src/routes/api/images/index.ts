import type { RequestHandler } from "@builder.io/qwik-city";
import { getAllImages } from "../../../lib/db";

export const onGet: RequestHandler = async ({ json }) => {
  try {
    const images = await getAllImages();
    const result = images.map((img) => ({
      id: img.id,
      original_name: img.original_name,
      original_path: img.original_path,
      optimized_path: img.optimized_path,
      width: img.width,
      height: img.height,
    }));
    json(200, result);
  } catch (err: any) {
    console.error("API error:", err);
    json(500, { error: "Failed to fetch images" });
  }
};
