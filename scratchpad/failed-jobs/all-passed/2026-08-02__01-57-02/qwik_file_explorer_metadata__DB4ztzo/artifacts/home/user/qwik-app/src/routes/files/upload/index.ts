import { type RequestHandler } from "@builder.io/qwik-city";
import fs from "fs";
import path from "path";
import db from "../../../db";

export const onPost: RequestHandler = async (event) => {
  try {
    const formData = await event.request.formData();
    const file = formData.get("file");
    const tag = formData.get("tag");

    if (
      !file ||
      typeof file === "string" ||
      !file.name ||
      !tag ||
      typeof tag !== "string" ||
      tag.trim() === ""
    ) {
      event.json(400, { error: "File or tag is missing or invalid" });
      return;
    }

    const uploadsDir = "/home/user/qwik-app/public/uploads";
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, file.name);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(filePath, buffer);

    // Insert metadata into SQLite
    const stmt = db.prepare(
      "INSERT INTO files (name, size, mime, tag) VALUES (?, ?, ?, ?)"
    );
    const result = stmt.run(
      file.name,
      file.size,
      file.type || "application/octet-stream",
      tag
    );

    const insertedId = Number(result.lastInsertRowid);

    event.json(201, {
      id: insertedId,
      name: file.name,
      size: file.size,
      mime: file.type || "application/octet-stream",
      tag: tag,
    });
  } catch (error: any) {
    event.json(400, {
      error: error.message || "An error occurred during upload",
    });
  }
};
