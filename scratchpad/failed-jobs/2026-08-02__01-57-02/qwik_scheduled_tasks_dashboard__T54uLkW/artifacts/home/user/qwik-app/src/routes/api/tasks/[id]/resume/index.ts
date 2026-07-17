import type { RequestHandler } from "@builder.io/qwik-city";
import { db, initRunner, scheduleTask } from "~/lib/db";

// Ensure runner is initialized
initRunner();

export const onPost: RequestHandler = async ({ params, json }) => {
  try {
    const { id } = params;

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as any;
    if (!task) {
      json(404, { error: `Task with id '${id}' not found` });
      return;
    }

    db.prepare("UPDATE tasks SET status = 'ACTIVE' WHERE id = ?").run(id);
    scheduleTask(task);

    json(200, { id, status: "ACTIVE" });
  } catch (err: any) {
    json(500, { error: err.message });
  }
};
