import type { RequestHandler } from "@builder.io/qwik-city";
import { getDb } from "../../../db";

export const onPost: RequestHandler = async ({ request, json, redirect }) => {
  const db = getDb();

  let title: string;

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await request.json();
    title = body.title;
  } else {
    // form data
    const formData = await request.formData();
    title = formData.get("title") as string;
  }

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    json(400, { error: "Title is required" });
    return;
  }

  title = title.trim();

  const result = db.transaction(() => {
    // Count current tasks in TODO column to determine position
    const countRow = db
      .prepare("SELECT COUNT(*) as count FROM tasks WHERE column = 'TODO'")
      .get() as { count: number };
    const position = countRow.count;

    const stmt = db.prepare(
      "INSERT INTO tasks (title, column, position) VALUES (?, 'TODO', ?)"
    );
    const info = stmt.run(title, position);

    const task = db
      .prepare("SELECT id, title, column, position FROM tasks WHERE id = ?")
      .get(info.lastInsertRowid);

    return task;
  })();

  // If this is a form submission (HTML), redirect back to kanban
  if (!contentType.includes("application/json")) {
    throw redirect(302, "/kanban");
  }

  json(201, result);
};
