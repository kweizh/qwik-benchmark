import type { RequestHandler } from "@builder.io/qwik-city";
import { db } from "../../../../../lib/db";
import { executeTaskCommand } from "../../../../../lib/runner";

export const onPost: RequestHandler = async (event) => {
  try {
    const id = event.params.id;
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as any;

    if (!task) {
      event.json(404, { error: `Task with id '${id}' not found` });
      return;
    }

    // Trigger in the background
    executeTaskCommand(task.id, task.command).catch((err: any) => {
      console.error(`Error in triggered task ${task.id}:`, err);
    });

    event.json(200, {
      id,
      triggered: true,
    });
  } catch (err: any) {
    event.json(500, { error: err.message });
  }
};
