import type { RequestHandler } from "@builder.io/qwik-city";
import { getDb } from "~/lib/db";

interface SearchResultRow {
  title: string;
  snippet: string;
}

export const onGet: RequestHandler = async ({ query, json }) => {
  const q = query.get("q");

  if (!q || q.trim() === "") {
    json(200, []);
    return;
  }

  const db = getDb();

  try {
    const stmt = db.prepare(
      `SELECT title, snippet(articles_fts, 1, '<b>', '</b>', '...', 10) as snippet
       FROM articles_fts
       WHERE articles_fts MATCH ?`,
    );

    const rows = stmt.all(q) as SearchResultRow[];

    json(
      200,
      rows.map((row) => ({
        title: row.title,
        snippet: row.snippet,
      })),
    );
  } catch {
    json(400, { error: "Invalid search query syntax" });
  }
};
