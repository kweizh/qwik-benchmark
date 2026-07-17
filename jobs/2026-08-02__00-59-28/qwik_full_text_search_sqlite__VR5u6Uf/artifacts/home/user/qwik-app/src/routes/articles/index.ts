import type { RequestHandler } from "@builder.io/qwik-city";
import { getDb } from "~/db";

export const onPost: RequestHandler = async ({ parseBody, json, status }) => {
  const body = (await parseBody()) as { title?: string; content?: string } | null;

  if (!body || !body.title || !body.content || body.title.trim() === "" || body.content.trim() === "") {
    status(400);
    json(400, { error: "Title and content are required" });
    return;
  }

  const db = getDb();

  const stmt = db.prepare(
    "INSERT INTO articles_fts (title, content) VALUES (?, ?)",
  );

  const result = stmt.run(body.title.trim(), body.content.trim());

  status(201);
  json(201, {
    rowid: Number(result.lastInsertRowid),
    title: body.title.trim(),
    content: body.content.trim(),
  });
};
