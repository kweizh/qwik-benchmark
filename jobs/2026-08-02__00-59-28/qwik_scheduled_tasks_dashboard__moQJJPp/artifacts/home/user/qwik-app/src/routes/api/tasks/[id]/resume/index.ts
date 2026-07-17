import type { RequestHandler } from "@builder.io/qwik-city";
import { getTaskById, updateTaskStatus } from "../../../../../db";

export const onPost: RequestHandler = async ({ params, json }) => {
  const id = params.id;
  const task = getTaskById(id);

  if (!task) {
    json(404, { error: "Task not found" });
    return;
  }

  updateTaskStatus(id, "ACTIVE");
  json(200, { id, status: "ACTIVE" });
};
