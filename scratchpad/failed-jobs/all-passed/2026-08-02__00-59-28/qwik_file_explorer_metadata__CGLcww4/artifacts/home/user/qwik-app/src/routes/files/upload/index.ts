import type { RequestHandler } from "@builder.io/qwik-city";
import { getDb } from "../../../db";
import fs from "fs";
import path from "path";

const UPLOADS_DIR = path.resolve("/home/user/qwik-app/public/uploads");

export const onPost: RequestHandler = async ({ request, json }) => {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      json(400, { error: "Content-Type must be multipart/form-data" });
      return;
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const tag = formData.get("tag") as string | null;

    if (!file || !(file instanceof File) || file.size === 0) {
      json(400, { error: "File is missing or invalid" });
      return;
    }

    if (!tag || typeof tag !== "string" || tag.trim() === "") {
      json(400, { error: "Tag is missing or invalid" });
      return;
    }

    // Ensure uploads directory exists
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const filePath = path.join(UPLOADS_DIR, fileName);

    // Handle duplicate filenames by appending a timestamp
    let uniqueName = fileName;
    let uniquePath = filePath;
    if (fs.existsSync(filePath)) {
      const ext = path.extname(fileName);
      const base = path.basename(fileName, ext);
      uniqueName = `${base}_${Date.now()}${ext}`;
      uniquePath = path.join(UPLOADS_DIR, uniqueName);
    }

    fs.writeFileSync(uniquePath, buffer);

    const db = getDb();
    const stmt = db.prepare(
      "INSERT INTO files (name, size, mime, tag) VALUES (?, ?, ?, ?)"
    );
    const result = stmt.run(uniqueName, file.size, file.type || "application/octet-stream", tag.trim());

    json(201, {
      id: result.lastInsertRowid as number,
      name: uniqueName,
      size: file.size,
      mime: file.type || "application/octet-stream",
      tag: tag.trim(),
    });
  } catch (err: any) {
    json(400, { error: err.message || "Upload failed" });
  }
};
