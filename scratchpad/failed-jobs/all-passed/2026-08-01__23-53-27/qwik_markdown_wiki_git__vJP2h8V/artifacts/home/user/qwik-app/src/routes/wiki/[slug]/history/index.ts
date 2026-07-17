import type { RequestHandler } from "@builder.io/qwik-city";
import { db } from "../../../../utils/db";

export const onGet: RequestHandler = async (requestEvent) => {
  const slug = requestEvent.params.slug;

  try {
    const stmt = db.prepare(`
      SELECT id, slug, user, timestamp, content_length
      FROM revisions
      WHERE slug = ?
      ORDER BY timestamp DESC
    `);
    const rows = stmt.all(slug);

    requestEvent.json(200, rows);
    return;
  } catch {
    throw requestEvent.error(500, "Internal Server Error");
  }
};
