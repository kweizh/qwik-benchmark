import type { RequestHandler } from "@builder.io/qwik-city";
import { createTask, getAllTasks, getTaskById, type Task, type TaskStatus } from "~/lib/db";

export const onGet: RequestHandler = async (requestEvent) => {
  const tasks = getAllTasks();
  requestEvent.json(200, tasks);
};

export const onPost: RequestHandler = async (requestEvent) => {
  let body: unknown;
  try {
    body = await requestEvent.request.json();
  } catch {
    requestEvent.json(400, { error: "Request body must be valid JSON" });
    return;
  }

  if (typeof body !== "object" || body === null) {
    requestEvent.json(400, { error: "Request body must be a JSON object" });
    return;
  }

  const { id, name, command, interval_seconds, status } = body as Record<string, unknown>;

  const errors: string[] = [];
  if (typeof id !== "string" || !id.trim()) errors.push("id is required");
  if (typeof name !== "string" || !name.trim()) errors.push("name is required");
  if (typeof command !== "string" || !command.trim()) errors.push("command is required");
  if (
    typeof interval_seconds !== "number" ||
    !Number.isFinite(interval_seconds) ||
    interval_seconds <= 0
  ) {
    errors.push("interval_seconds must be a positive number");
  }
  if (status !== "ACTIVE" && status !== "PAUSED") {
    errors.push("status must be 'ACTIVE' or 'PAUSED'");
  }

  if (errors.length > 0) {
    requestEvent.json(400, { error: "Invalid task payload", details: errors });
    return;
  }

  if (getTaskById(id as string)) {
    requestEvent.json(400, { error: `Task with id "${id}" already exists` });
    return;
  }

  const task: Task = {
    id: id as string,
    name: name as string,
    command: command as string,
    interval_seconds: interval_seconds as number,
    status: status as TaskStatus,
  };

  createTask(task);
  requestEvent.json(201, task);
};
