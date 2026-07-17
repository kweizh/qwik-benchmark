import type { RequestHandler } from "@builder.io/qwik-city";
import { db } from "~/lib/db";

export const onGet: RequestHandler = async ({ params, json }) => {
  const { id } = params;
  try {
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    if (!task) {
      json(404, { error: `Task with id '${id}' not found` });
      return;
    }

    const history = db
      .prepare("SELECT * FROM execution_history WHERE task_id = ? ORDER BY timestamp DESC")
      .all(id);

    json(200, history);
  } catch (err: any) {
    json(500, { error: err.message });
  }
};
