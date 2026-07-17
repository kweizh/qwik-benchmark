import type { RequestHandler } from "@builder.io/qwik-city";
import { getImages } from "../../../lib/db";

export const onGet: RequestHandler = async ({ json }) => {
  const images = getImages();
  // Map the response format requested by the user:
  // [
  //   {
  //     "id": 1,
  //     "original_name": "myphoto.png",
  //     "original_path": "/gallery/original/filename.png",
  //     "optimized_path": "/gallery/optimized/filename.webp",
  //     "width": 800,
  //     "height": 600
  //   }
  // ]
  const formattedImages = images.map((img) => ({
    id: img.id,
    original_name: img.original_name,
    original_path: img.original_path,
    optimized_path: img.optimized_path,
    width: img.width,
    height: img.height,
  }));

  json(200, formattedImages);
};
