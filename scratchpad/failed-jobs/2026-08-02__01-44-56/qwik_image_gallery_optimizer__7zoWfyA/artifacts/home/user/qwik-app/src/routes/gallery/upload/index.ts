import type { RequestHandler } from "@builder.io/qwik-city";
import { db } from "../../../lib/db";
import { writeFileSync } from "fs";
import { join, extname } from "path";
import crypto from "crypto";
import sharp from "sharp";

export const onPost: RequestHandler = async (ev) => {
  const { request, redirect } = ev;
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image");

    if (!imageFile || !(imageFile instanceof File) || imageFile.size === 0) {
      throw redirect(303, "/gallery");
    }

    const originalName = imageFile.name;
    const ext = extname(originalName) || ".png";
    const uniqueId = crypto.randomUUID();
    const originalFilename = `${uniqueId}${ext}`;
    const optimizedFilename = `${uniqueId}.webp`;

    const originalPathOnDisk = join("/home/user/qwik-app/public/gallery/original", originalFilename);
    const optimizedPathOnDisk = join("/home/user/qwik-app/public/gallery/optimized", optimizedFilename);

    const originalPublicPath = `/gallery/original/${originalFilename}`;
    const optimizedPublicPath = `/gallery/optimized/${optimizedFilename}`;

    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save original
    writeFileSync(originalPathOnDisk, buffer);

    // Optimize and resize
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;

    let pipeline = sharp(buffer);
    if (originalWidth > 800 || originalHeight > 800) {
      pipeline = pipeline.resize({
        width: 800,
        height: 800,
        fit: "inside",
        withoutEnlargement: true
      });
    }

    const optimizedBuffer = await pipeline.webp().toBuffer();
    writeFileSync(optimizedPathOnDisk, optimizedBuffer);

    const optimizedMetadata = await sharp(optimizedBuffer).metadata();
    const width = optimizedMetadata.width || 0;
    const height = optimizedMetadata.height || 0;

    // DB insert
    const stmt = db.prepare(`
      INSERT INTO images (original_name, original_path, optimized_path, width, height)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(originalName, originalPublicPath, optimizedPublicPath, width, height);

    throw redirect(303, "/gallery");
  } catch (err: any) {
    if (err && typeof err === "object" && (err.constructor?.name === "RedirectMessage" || err.constructor?.name === "AbortMessage")) {
      throw err;
    }
    console.error("Upload error:", err);
    throw redirect(303, "/gallery");
  }
};
