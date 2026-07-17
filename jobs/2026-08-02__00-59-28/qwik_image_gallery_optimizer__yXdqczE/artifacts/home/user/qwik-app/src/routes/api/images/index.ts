import type { RequestHandler } from "@builder.io/qwik-city";
import { getDb, type ImageRecord } from "../../../lib/db";

export const onGet: RequestHandler = async ({ json }) => {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, original_name, original_path, optimized_path, width, height, uploaded_at FROM images ORDER BY uploaded_at DESC"
    )
    .all() as ImageRecord[];

  const result = rows.map((row) => ({
    id: row.id,
    original_name: row.original_name,
    original_path: row.original_path,
    optimized_path: row.optimized_path,
    width: row.width,
    height: row.height,
  }));

  json(200, result);
};
