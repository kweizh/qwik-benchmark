import type { RequestHandler } from "@builder.io/qwik-city";
import { insertImage } from "../../../lib/db";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

export const onPost: RequestHandler = async ({ request, redirect }) => {
  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!file || !(file instanceof File) || file.size === 0) {
      throw redirect(303, "/gallery?error=No+file+uploaded");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename preserving extension
    const ext = path.extname(file.name) || ".png";
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const originalFilename = `${uniqueId}${ext}`;
    const optimizedFilename = `${uniqueId}.webp`;

    const originalDir = "/home/user/qwik-app/public/gallery/original";
    const optimizedDir = "/home/user/qwik-app/public/gallery/optimized";

    await fs.mkdir(originalDir, { recursive: true });
    await fs.mkdir(optimizedDir, { recursive: true });

    const originalFilePath = path.join(originalDir, originalFilename);
    const optimizedFilePath = path.join(optimizedDir, optimizedFilename);

    // Save original image
    await fs.writeFile(originalFilePath, buffer);

    // Optimize using sharp
    let pipeline = sharp(buffer);
    pipeline = pipeline.resize(800, 800, {
      fit: "inside",
      withoutEnlargement: true,
    }).webp();

    const optimizedBuffer = await pipeline.toBuffer();
    await fs.writeFile(optimizedFilePath, optimizedBuffer);

    // Get optimized dimensions
    const optimizedMetadata = await sharp(optimizedBuffer).metadata();
    const width = optimizedMetadata.width || 800;
    const height = optimizedMetadata.height || 600;

    // Database insert
    const originalPath = `/gallery/original/${originalFilename}`;
    const optimizedPath = `/gallery/optimized/${optimizedFilename}`;

    await insertImage({
      original_name: file.name,
      original_path: originalPath,
      optimized_path: optimizedPath,
      width,
      height,
    });

    throw redirect(303, "/gallery");
  } catch (err: any) {
    if (err instanceof Error) {
      console.error("Upload error:", err);
      throw redirect(303, "/gallery?error=Upload+failed");
    }
    throw err;
  }
};
