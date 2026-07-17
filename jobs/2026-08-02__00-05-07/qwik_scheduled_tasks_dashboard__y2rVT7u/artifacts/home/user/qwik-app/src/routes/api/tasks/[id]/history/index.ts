import type { RequestHandler } from "@builder.io/qwik-city";
import { getHistoryForTask, getTaskById } from "~/lib/db";

export const onGet: RequestHandler = async (requestEvent) => {
  const { id } = requestEvent.params;
  const task = getTaskById(id);

  if (!task) {
    requestEvent.json(404, { error: `Task "${id}" not found` });
    return;
  }

  const history = getHistoryForTask(id);
  requestEvent.json(200, history);
};
