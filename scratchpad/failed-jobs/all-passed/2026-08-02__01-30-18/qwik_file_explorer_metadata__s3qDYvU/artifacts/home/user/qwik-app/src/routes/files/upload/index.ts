import type { RequestHandler } from "@builder.io/qwik-city";
import { db } from "../../../lib/db";
import { writeFileSync } from "fs";
import { join } from "path";

export const onPost: RequestHandler = async (ev) => {
  try {
    const formData = await ev.request.formData();
    const file = formData.get("file");
    const tag = formData.get("tag");

    // Check if file is missing or invalid
    if (!file || typeof file === "string" || !(file instanceof File) || file.name === "" || file.size === 0) {
      ev.json(400, { error: "File is missing or invalid" });
      return;
    }

    // Check if tag is missing or invalid
    if (!tag || typeof tag !== "string" || tag.trim() === "") {
      ev.json(400, { error: "Tag is missing or invalid" });
      return;
    }

    const uploadDir = "/home/user/qwik-app/public/uploads";
    const filePath = join(uploadDir, file.name);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    writeFileSync(filePath, buffer);

    const stmt = db.prepare(`
      INSERT INTO files (name, size, mime, tag)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(file.name, file.size, file.type || "application/octet-stream", tag);
    const insertId = result.lastInsertRowid;

    ev.status(201);
    ev.json(201, {
      id: Number(insertId),
      name: file.name,
      size: file.size,
      mime: file.type || "application/octet-stream",
      tag: tag,
    });
  } catch (error: any) {
    ev.json(400, { error: error.message || "An error occurred during upload" });
  }
};
