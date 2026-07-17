import type { RequestHandler } from "@builder.io/qwik-city";
import db, { Task } from "../../../lib/db";

export const onPost: RequestHandler = async (ev) => {
  try {
    let body: any = null;
    try {
      body = await ev.parseBody();
    } catch {
      // ignore
    }
    if (!body) {
      try {
        body = await ev.request.json();
      } catch {
        // ignore
      }
    }
    if (!body) {
      try {
        const formData = await ev.request.formData();
        body = Object.fromEntries(formData.entries());
      } catch {
        // ignore
      }
    }

    const title = body?.title;
    if (typeof title !== "string") {
      ev.json(400, { error: "Title is required and must be a string." });
      return;
    }

    const newTask = db.transaction((taskTitle: string): Task => {
      const countStmt = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE column = 'TODO'");
      const row = countStmt.get() as { count: number };
      const position = row.count;

      const insertStmt = db.prepare("INSERT INTO tasks (title, column, position) VALUES (?, 'TODO', ?)");
      const result = insertStmt.run(taskTitle, position);

      return {
        id: Number(result.lastInsertRowid),
        title: taskTitle,
        column: "TODO",
        position,
      };
    })(title);

    ev.json(201, newTask);
  } catch (err: any) {
    ev.json(500, { error: err.message });
  }
};
