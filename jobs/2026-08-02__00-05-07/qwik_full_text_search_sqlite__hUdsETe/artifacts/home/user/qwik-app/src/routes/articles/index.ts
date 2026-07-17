import type { RequestHandler } from "@builder.io/qwik-city";
import { getDb } from "~/lib/db";

interface CreateArticleBody {
  title?: unknown;
  content?: unknown;
}

export const onPost: RequestHandler = async ({ request, json }) => {
  let body: CreateArticleBody;

  try {
    body = (await request.json()) as CreateArticleBody;
  } catch {
    body = {};
  }

  const title = body?.title;
  const content = body?.content;

  if (
    typeof title !== "string" ||
    typeof content !== "string" ||
    title.trim() === "" ||
    content.trim() === ""
  ) {
    json(400, { error: "Title and content are required" });
    return;
  }

  const db = getDb();

  const stmt = db.prepare(
    "INSERT INTO articles_fts (title, content) VALUES (?, ?)",
  );
  const info = stmt.run(title, content);

  json(201, {
    rowid: Number(info.lastInsertRowid),
    title,
    content,
  });
};
