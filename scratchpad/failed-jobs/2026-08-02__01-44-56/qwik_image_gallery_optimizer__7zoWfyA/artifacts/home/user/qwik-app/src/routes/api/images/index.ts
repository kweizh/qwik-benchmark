import type { RequestHandler } from "@builder.io/qwik-city";
import { db } from "../../../lib/db";

export const onGet: RequestHandler = async ({ json }) => {
  try {
    const stmt = db.prepare(`
      SELECT id, original_name, original_path, optimized_path, width, height
      FROM images
      ORDER BY uploaded_at DESC
    `);
    const rows = stmt.all();
    json(200, rows);
  } catch (err: any) {
    json(500, { error: err.message });
  }
};
