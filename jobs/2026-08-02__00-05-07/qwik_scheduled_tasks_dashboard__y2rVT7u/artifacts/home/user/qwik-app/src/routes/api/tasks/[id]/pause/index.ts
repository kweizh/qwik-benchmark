import type { RequestHandler } from "@builder.io/qwik-city";
import { getTaskById, updateTaskStatus } from "~/lib/db";

export const onPost: RequestHandler = async (requestEvent) => {
  const { id } = requestEvent.params;
  const task = getTaskById(id);

  if (!task) {
    requestEvent.json(404, { error: `Task "${id}" not found` });
    return;
  }

  updateTaskStatus(id, "PAUSED");
  requestEvent.json(200, { id, status: "PAUSED" });
};
