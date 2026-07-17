import type { RequestHandler } from "@builder.io/qwik-city";
import { db } from "../../../../../lib/db";

export const onGet: RequestHandler = async (event) => {
  try {
    const id = event.params.id;
    const task = db.prepare("SELECT id FROM tasks WHERE id = ?").get(id);

    if (!task) {
      event.json(404, { error: `Task with id '${id}' not found` });
      return;
    }

    const history = db.prepare(
      "SELECT * FROM execution_history WHERE task_id = ? ORDER BY timestamp DESC"
    ).all(id);

    event.json(200, history);
  } catch (err: any) {
    event.json(500, { error: err.message });
  }
};
