import sharp from "sharp";
import path from "path";
import fs from "fs";
function generateId(): string {
  return Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 10);
}

const ORIGINAL_DIR = "/home/user/qwik-app/public/gallery/original";
const OPTIMIZED_DIR = "/home/user/qwik-app/public/gallery/optimized";
const MAX_DIMENSION = 800;

export interface OptimizeResult {
  originalName: string;
  originalPath: string;
  optimizedPath: string;
  width: number;
  height: number;
}

export async function saveAndOptimizeImage(
  buffer: Buffer,
  originalFilename: string,
): Promise<OptimizeResult> {
  // Ensure directories exist
  fs.mkdirSync(ORIGINAL_DIR, { recursive: true });
  fs.mkdirSync(OPTIMIZED_DIR, { recursive: true });

  const ext = path.extname(originalFilename);
  const baseId = generateId();
  const originalFilenameSaved = baseId + ext;
  const optimizedFilename = baseId + ".webp";

  const originalPath = path.join(ORIGINAL_DIR, originalFilenameSaved);
  const optimizedPath = path.join(OPTIMIZED_DIR, optimizedFilename);

  // Save original
  fs.writeFileSync(originalPath, buffer);

  // Get original dimensions
  const metadata = await sharp(buffer).metadata();
  const origWidth = metadata.width || 0;
  const origHeight = metadata.height || 0;

  // Determine resize dimensions
  let resizeWidth: number;
  let resizeHeight: number;

  if (origWidth <= MAX_DIMENSION && origHeight <= MAX_DIMENSION) {
    // Don't scale up — keep original dimensions
    resizeWidth = origWidth;
    resizeHeight = origHeight;
  } else {
    // Scale so the maximum dimension is MAX_DIMENSION
    if (origWidth >= origHeight) {
      resizeWidth = MAX_DIMENSION;
      resizeHeight = Math.round((origHeight / origWidth) * MAX_DIMENSION);
    } else {
      resizeHeight = MAX_DIMENSION;
      resizeWidth = Math.round((origWidth / origHeight) * MAX_DIMENSION);
    }
  }

  // Optimize and convert to WebP
  await sharp(buffer)
    .resize(resizeWidth, resizeHeight, { fit: "inside" })
    .webp({ quality: 80 })
    .toFile(optimizedPath);

  return {
    originalName: originalFilename,
    originalPath: "/gallery/original/" + originalFilenameSaved,
    optimizedPath: "/gallery/optimized/" + optimizedFilename,
    width: resizeWidth,
    height: resizeHeight,
  };
}
