import type { RequestHandler } from "@builder.io/qwik-city";
import { listImages } from "~/lib/db";

export const onGet: RequestHandler = async (requestEvent) => {
  const images = listImages().map((image) => ({
    id: image.id,
    original_name: image.original_name,
    original_path: image.original_path,
    optimized_path: image.optimized_path,
    width: image.width,
    height: image.height,
  }));

  requestEvent.json(200, images);
};
