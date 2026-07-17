import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const PROJECT_ROOT = "/home/user/qwik-app";
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public");

export const ORIGINAL_DIR = path.join(PUBLIC_DIR, "gallery", "original");
export const OPTIMIZED_DIR = path.join(PUBLIC_DIR, "gallery", "optimized");

export const ORIGINAL_URL_PREFIX = "/gallery/original/";
export const OPTIMIZED_URL_PREFIX = "/gallery/optimized/";

const MAX_DIMENSION = 800;

export interface ProcessedUpload {
  originalName: string;
  originalPath: string;
  optimizedPath: string;
  width: number;
  height: number;
}

/**
 * Saves the original file and a resized/optimized WebP version to disk,
 * returning the public URL paths and the optimized image dimensions.
 */
export async function processUpload(file: File): Promise<ProcessedUpload> {
  await mkdir(ORIGINAL_DIR, { recursive: true });
  await mkdir(OPTIMIZED_DIR, { recursive: true });

  const originalName = file.name || "upload";
  const ext = path.extname(originalName) || "";
  const uniqueId = randomUUID();

  const originalFileName = `${uniqueId}${ext}`;
  const optimizedFileName = `${uniqueId}.webp`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Save the original file untouched.
  const originalFullPath = path.join(ORIGINAL_DIR, originalFileName);
  await writeFile(originalFullPath, buffer);

  // Resize (max dimension 800px, no upscaling) and convert to WebP.
  const optimizedFullPath = path.join(OPTIMIZED_DIR, optimizedFileName);
  const info = await sharp(buffer)
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp()
    .toFile(optimizedFullPath);

  return {
    originalName,
    originalPath: `${ORIGINAL_URL_PREFIX}${originalFileName}`,
    optimizedPath: `${OPTIMIZED_URL_PREFIX}${optimizedFileName}`,
    width: info.width,
    height: info.height,
  };
}
