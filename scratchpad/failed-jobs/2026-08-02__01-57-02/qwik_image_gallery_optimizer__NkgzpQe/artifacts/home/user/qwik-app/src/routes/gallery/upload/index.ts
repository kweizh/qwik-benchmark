import type { RequestHandler } from '@builder.io/qwik-city';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { writeFile } from 'fs/promises';
import sharp from 'sharp';
import db from '../../../db';

export const onPost: RequestHandler = async ({ request, redirect, error }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file || file.size === 0) {
      throw error(400, 'No image file uploaded.');
    }

    const originalName = file.name;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate unique names
    const uuid = randomUUID();
    const originalExt = extname(originalName) || '.jpg';
    const uniqueOriginalName = `${uuid}${originalExt}`;
    const uniqueOptimizedName = `${uuid}.webp`;

    // Paths
    const originalPath = `/gallery/original/${uniqueOriginalName}`;
    const optimizedPath = `/gallery/optimized/${uniqueOptimizedName}`;

    const originalDiskPath = join('/home/user/qwik-app/public/gallery/original', uniqueOriginalName);
    const optimizedDiskPath = join('/home/user/qwik-app/public/gallery/optimized', uniqueOptimizedName);

    // Save original image
    await writeFile(originalDiskPath, buffer);

    // Optimize image
    const metadata = await sharp(buffer).metadata();
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;

    let width = originalWidth;
    let height = originalHeight;
    let sharpInstance = sharp(buffer);

    if (originalWidth > 800 || originalHeight > 800) {
      if (originalWidth >= originalHeight) {
        width = 800;
        height = Math.round((originalHeight * 800) / originalWidth);
      } else {
        height = 800;
        width = Math.round((originalWidth * 800) / originalHeight);
      }
      sharpInstance = sharpInstance.resize(width, height);
    }

    const optimizedBuffer = await sharpInstance.webp().toBuffer();
    await writeFile(optimizedDiskPath, optimizedBuffer);

    // Get final optimized dimensions to be 100% sure
    const optimizedMetadata = await sharp(optimizedBuffer).metadata();
    const finalWidth = optimizedMetadata.width || width;
    const finalHeight = optimizedMetadata.height || height;

    // Save metadata to DB
    const stmt = db.prepare(`
      INSERT INTO images (original_name, original_path, optimized_path, width, height)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(originalName, originalPath, optimizedPath, finalWidth, finalHeight);

    // Redirect to /gallery
    throw redirect(303, '/gallery');
  } catch (err: any) {
    // If it's a Qwik redirect or error throw, rethrow it
    if (err && typeof err === 'object') {
      const name = err.constructor?.name;
      if (name === 'RedirectMessage' || name === 'ServerError' || err.status) {
        throw err;
      }
    }
    console.error('Upload handler error:', err);
    throw error(500, 'Failed to upload and optimize image.');
  }
};
