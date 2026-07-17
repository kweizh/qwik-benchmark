import type { RequestHandler } from "@builder.io/qwik-city";
import { db, initRunner, pauseTask } from "~/lib/db";

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

    db.prepare("UPDATE tasks SET status = 'PAUSED' WHERE id = ?").run(id);
    pauseTask(id);

    json(200, { id, status: "PAUSED" });
  } catch (err: any) {
    json(500, { error: err.message });
  }
};
