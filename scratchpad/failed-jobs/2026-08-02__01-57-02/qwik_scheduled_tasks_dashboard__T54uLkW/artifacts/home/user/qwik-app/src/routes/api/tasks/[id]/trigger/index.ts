import type { RequestHandler } from "@builder.io/qwik-city";
import { db, initRunner, executeTask } from "~/lib/db";

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

    // Execute immediately in background
    executeTask(task);

    json(200, { id, triggered: true });
  } catch (err: any) {
    json(500, { error: err.message });
  }
};
