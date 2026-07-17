import type { RequestHandler } from "@builder.io/qwik-city";
import { getDb } from "../../../db";
import fs from "fs";
import path from "path";

const UPLOADS_DIR = path.resolve("/home/user/qwik-app/public/uploads");

export const onDelete: RequestHandler = async ({ params, json }) => {
  const id = parseInt(params.id, 10);

  if (isNaN(id)) {
    json(404, { error: "Invalid file ID" });
    return;
  }

  const db = getDb();
  const row = db.prepare("SELECT * FROM files WHERE id = ?").get(id) as any;

  if (!row) {
    json(404, { error: "File not found" });
    return;
  }

  // Delete physical file from disk if it exists
  const filePath = path.join(UPLOADS_DIR, row.name);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Delete database record
  db.prepare("DELETE FROM files WHERE id = ?").run(id);

  json(200, { success: true });
};
