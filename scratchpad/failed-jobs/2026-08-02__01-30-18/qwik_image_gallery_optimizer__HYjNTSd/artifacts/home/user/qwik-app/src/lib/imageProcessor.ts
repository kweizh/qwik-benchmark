import sharp from "sharp";
import { join, extname } from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const ORIGINAL_DIR = "/home/user/qwik-app/public/gallery/original";
const OPTIMIZED_DIR = "/home/user/qwik-app/public/gallery/optimized";

// Ensure directories exist
function ensureDirs() {
  if (!existsSync(ORIGINAL_DIR)) {
    mkdirSync(ORIGINAL_DIR, { recursive: true });
  }
  if (!existsSync(OPTIMIZED_DIR)) {
    mkdirSync(OPTIMIZED_DIR, { recursive: true });
  }
}

export interface ProcessedImageResult {
  originalName: string;
  originalPath: string;
  optimizedPath: string;
  width: number;
  height: number;
}

export async function processUploadedImage(
  buffer: Buffer,
  originalName: string
): Promise<ProcessedImageResult> {
  ensureDirs();

  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  const originalExt = extname(originalName) || ".png";
  const originalFilename = `${uniqueId}${originalExt}`;
  const optimizedFilename = `${uniqueId}.webp`;

  const originalFilePath = join(ORIGINAL_DIR, originalFilename);
  const optimizedFilePath = join(OPTIMIZED_DIR, optimizedFilename);

  // Write original file
  writeFileSync(originalFilePath, buffer);

  // Resize, optimize and convert to WebP
  const info = await sharp(buffer)
    .resize(800, 800, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toFile(optimizedFilePath);

  return {
    originalName,
    originalPath: `/gallery/original/${originalFilename}`,
    optimizedPath: `/gallery/optimized/${optimizedFilename}`,
    width: info.width,
    height: info.height,
  };
}
