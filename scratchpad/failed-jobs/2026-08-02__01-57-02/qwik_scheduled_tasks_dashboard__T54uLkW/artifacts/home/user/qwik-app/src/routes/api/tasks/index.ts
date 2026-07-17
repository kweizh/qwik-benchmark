import type { RequestHandler } from "@builder.io/qwik-city";
import { db, initRunner, scheduleTask } from "~/lib/db";

// Ensure runner is initialized
initRunner();

export const onGet: RequestHandler = async ({ json }) => {
  try {
    const tasks = db.prepare("SELECT * FROM tasks").all();
    json(200, tasks);
  } catch (err: any) {
    json(500, { error: err.message });
  }
};

export const onPost: RequestHandler = async ({ json, parseBody }) => {
  try {
    const body = (await parseBody()) as any;
    if (!body || typeof body !== "object") {
      json(400, { error: "Invalid request body" });
      return;
    }

    const { id, name, command, interval_seconds, status } = body;

    if (!id || typeof id !== "string" || id.trim() === "") {
      json(400, { error: "id is required and must be a non-empty string" });
      return;
    }
    if (!name || typeof name !== "string" || name.trim() === "") {
      json(400, { error: "name is required and must be a non-empty string" });
      return;
    }
    if (!command || typeof command !== "string" || command.trim() === "") {
      json(400, { error: "command is required and must be a non-empty string" });
      return;
    }
    if (
      typeof interval_seconds !== "number" ||
      interval_seconds <= 0 ||
      !Number.isInteger(interval_seconds)
    ) {
      json(400, { error: "interval_seconds is required and must be an integer greater than 0" });
      return;
    }
    if (status !== "ACTIVE" && status !== "PAUSED") {
      json(400, { error: "status is required and must be either 'ACTIVE' or 'PAUSED'" });
      return;
    }

    // Check if task already exists
    const existing = db.prepare("SELECT 1 FROM tasks WHERE id = ?").get(id);
    if (existing) {
      json(400, { error: `Task with id '${id}' already exists` });
      return;
    }

    // Insert task into DB
    db.prepare(
      "INSERT INTO tasks (id, name, command, interval_seconds, status) VALUES (?, ?, ?, ?, ?)"
    ).run(id, name, command, interval_seconds, status);

    // If active, schedule it immediately
    if (status === "ACTIVE") {
      scheduleTask({ id, command, interval_seconds });
    }

    json(201, { id, name, command, interval_seconds, status });
  } catch (err: any) {
    json(500, { error: err.message });
  }
};
