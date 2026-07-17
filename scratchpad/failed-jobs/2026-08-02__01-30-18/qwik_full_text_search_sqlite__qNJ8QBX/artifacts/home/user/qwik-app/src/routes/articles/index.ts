import type { RequestHandler } from "@builder.io/qwik-city";
import { db } from "../../lib/db";

export const onPost: RequestHandler = async ({ parseBody, json }) => {
  const body = (await parseBody()) as any;

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
    const insert = db.prepare(
      "INSERT INTO articles_fts (title, content) VALUES (?, ?)",
    );
    const info = insert.run(title, content);

    json(201, {
      rowid: Number(info.lastInsertRowid),
      title,
      content,
    });
  } catch (err) {
    json(500, { error: "Internal Server Error" });
  }
};
