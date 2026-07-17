import type { RequestHandler } from "@builder.io/qwik-city";
import { db } from "~/lib/db";

export const onGet: RequestHandler = async ({ json }) => {
  try {
    const tasks = db.prepare("SELECT * FROM tasks").all();
    json(200, tasks);
  } catch (err: any) {
    json(500, { error: err.message });
  }
};

export const onPost: RequestHandler = async ({ request, json }) => {
  try {
    const body = await request.json();
    const { id, name, command, interval_seconds, status } = body;

    // Validation
    if (!id || typeof id !== "string" || !id.trim()) {
      json(400, { error: "Invalid or missing 'id'" });
      return;
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      json(400, { error: "Invalid or missing 'name'" });
      return;
    }
    if (!command || typeof command !== "string" || !command.trim()) {
      json(400, { error: "Invalid or missing 'command'" });
      return;
    }
    if (typeof interval_seconds !== "number" || interval_seconds <= 0) {
      json(400, { error: "Interval must be a positive integer" });
      return;
    }
    if (status !== "ACTIVE" && status !== "PAUSED") {
      json(400, { error: "Status must be either 'ACTIVE' or 'PAUSED'" });
      return;
    }

    // Check if task already exists
    const existing = db.prepare("SELECT 1 FROM tasks WHERE id = ?").get(id);
    if (existing) {
      json(400, { error: `Task with id '${id}' already exists` });
      return;
    }

    // Insert task
    db.prepare(
      "INSERT INTO tasks (id, name, command, interval_seconds, status) VALUES (?, ?, ?, ?, ?)"
    ).run(id, name, command, interval_seconds, status);

    json(201, {
      id,
      name,
      command,
      interval_seconds,
      status,
    });
  } catch (err: any) {
    json(400, { error: err.message || "Invalid JSON body" });
  }
};
