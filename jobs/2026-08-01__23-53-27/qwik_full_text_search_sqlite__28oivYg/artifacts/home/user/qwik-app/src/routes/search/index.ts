import type { RequestHandler } from "@builder.io/qwik-city";
import { getDb } from "~/lib/db";

export const onGet: RequestHandler = async ({ query, json }) => {
  const q = query.get("q");

  if (q === null || q.trim() === "") {
    json(200, []);
    return;
  }

  try {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT title, snippet(articles_fts, 1, '<b>', '</b>', '...', 10) AS snippet 
      FROM articles_fts 
      WHERE articles_fts MATCH ?
    `);
    const results = stmt.all(q);
    json(200, results);
  } catch (error) {
    json(400, { error: "Invalid search query syntax" });
  }
};
