import type { RequestHandler } from "@builder.io/qwik-city";
import { getTaskById } from "../../../../../db";
import { triggerTask } from "../../../../../runner";

export const onPost: RequestHandler = async ({ params, json }) => {
  const id = params.id;
  const task = getTaskById(id);

  if (!task) {
    json(404, { error: "Task not found" });
    return;
  }

  triggerTask(task.id, task.command);
  json(200, { id, triggered: true });
};
