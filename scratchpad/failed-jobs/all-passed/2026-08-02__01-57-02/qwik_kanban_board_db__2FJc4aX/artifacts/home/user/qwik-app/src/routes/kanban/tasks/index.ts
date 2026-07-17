import type { RequestHandler } from "@builder.io/qwik-city";
import db from "../../../lib/db";

export const onGet: RequestHandler = async (ev) => {
  try {
    const stmt = db.prepare("SELECT id, title, column, position FROM tasks ORDER BY column ASC, position ASC");
    const tasks = stmt.all();
    ev.json(200, tasks);
  } catch (err: any) {
    ev.json(500, { error: err.message });
  }
};
