import type { RequestHandler } from "@builder.io/qwik-city";
import { getDb } from "../../lib/db";

export const onPost: RequestHandler = async ({ json, parseBody }) => {
  let body: any;
  try {
    body = await parseBody();
  } catch {
    json(400, { error: "Title and content are required" });
    return;
  }

  if (!body || typeof body !== "object") {
    json(400, { error: "Title and content are required" });
    return;
  }

  const { title, content } = body;

  if (
    typeof title !== "string" ||
    typeof content !== "string" ||
    title.trim() === "" ||
    content.trim() === ""
  ) {
    json(400, { error: "Title and content are required" });
    return;
  }

  try {
    const db = getDb();
    const stmt = db.prepare(
      "INSERT INTO articles_fts (title, content) VALUES (?, ?)"
    );
    const info = stmt.run(title, content);

    json(201, {
      rowid: Number(info.lastInsertRowid),
      title,
      content,
    });
  } catch {
    json(500, { error: "Failed to create article" });
  }
};
