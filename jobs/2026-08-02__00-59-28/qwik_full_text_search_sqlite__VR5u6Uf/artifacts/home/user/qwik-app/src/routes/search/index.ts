import type { RequestHandler } from "@builder.io/qwik-city";
import { getDb } from "~/db";

export const onGet: RequestHandler = async ({ query, json, status }) => {
  const q = query.get("q");

  if (!q || q.trim() === "") {
    json(200, []);
    return;
  }

  const db = getDb();

  try {
    const stmt = db.prepare(`
      SELECT
        title,
        snippet(articles_fts, 1, '<b>', '</b>', '...', 10) AS snippet
      FROM articles_fts
      WHERE articles_fts MATCH ?
    `);

    const results = stmt.all(q.trim()) as { title: string; snippet: string }[];

    json(200, results);
  } catch {
    status(400);
    json(400, { error: "Invalid search query syntax" });
  }
};
