import type { RequestHandler } from "@builder.io/qwik-city";
import { getTaskById, getExecutionHistory } from "../../../../../db";

export const onGet: RequestHandler = async ({ params, json }) => {
  const id = params.id;
  const task = getTaskById(id);

  if (!task) {
    json(404, { error: "Task not found" });
    return;
  }

  const history = getExecutionHistory(id);
  json(200, history);
};
