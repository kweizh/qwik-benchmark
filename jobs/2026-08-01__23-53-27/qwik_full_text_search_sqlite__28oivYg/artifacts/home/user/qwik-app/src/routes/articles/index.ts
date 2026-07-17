import type { RequestHandler } from "@builder.io/qwik-city";
import { getDb } from "~/lib/db";

export const onPost: RequestHandler = async ({ parseBody, json }) => {
  let body: any;
  try {
    body = await parseBody();
  } catch (error) {
    json(400, { error: "Title and content are required" });
    return;
  }

  if (!body || typeof body !== "object") {
    json(400, { error: "Title and content are required" });
    return;
  }

  const { title, content } = body as Record<string, any>;

  if (
    typeof title !== "string" ||
    title.trim() === "" ||
    typeof content !== "string" ||
    content.trim() === ""
  ) {
    json(400, { error: "Title and content are required" });
    return;
  }

  try {
    const db = getDb();
    const insert = db.prepare(
      "INSERT INTO articles_fts (title, content) VALUES (?, ?)"
    );
    const res = insert.run(title, content);
    const rowid = Number(res.lastInsertRowid);

    json(201, {
      rowid,
      title,
      content,
    });
  } catch (error) {
    json(500, { error: "Failed to create article" });
  }
};
