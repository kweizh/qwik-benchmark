import type { RequestHandler } from "@builder.io/qwik-city";
import { getTaskById } from "~/lib/db";
import { triggerTaskNow } from "~/lib/scheduler";

export const onPost: RequestHandler = async (requestEvent) => {
  const { id } = requestEvent.params;
  const task = getTaskById(id);

  if (!task) {
    requestEvent.json(404, { error: `Task "${id}" not found` });
    return;
  }

  // Fire-and-forget: the command runs in the background, the response
  // confirms the trigger was accepted, not that the command has finished.
  triggerTaskNow(task.id, task.command);
  requestEvent.json(200, { id, triggered: true });
};
