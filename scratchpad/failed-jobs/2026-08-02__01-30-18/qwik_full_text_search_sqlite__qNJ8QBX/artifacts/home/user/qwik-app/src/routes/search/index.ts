import type { RequestHandler } from "@builder.io/qwik-city";
import { db } from "../../lib/db";

export const onGet: RequestHandler = async ({ query, json }) => {
  const q = query.get("q");

  if (!q || q.trim() === "") {
    json(200, []);
    return;
  }

  try {
    const results = db
      .prepare(
        `SELECT title, snippet(articles_fts, 1, '<b>', '</b>', '...', 10) as snippet
         FROM articles_fts
         WHERE articles_fts MATCH ?`,
      )
      .all(q) as { title: string; snippet: string }[];

    json(200, results);
  } catch (err) {
    json(400, { error: "Invalid search query syntax" });
  }
};
