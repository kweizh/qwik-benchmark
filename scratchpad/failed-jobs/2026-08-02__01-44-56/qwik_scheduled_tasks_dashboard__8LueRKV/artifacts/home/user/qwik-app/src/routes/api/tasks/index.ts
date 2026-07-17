import type { RequestHandler } from "@builder.io/qwik-city";
import { db } from "../../../lib/db";

export const onGet: RequestHandler = async (event) => {
  try {
    const tasks = db.prepare("SELECT * FROM tasks").all();
    event.json(200, tasks);
  } catch (err: any) {
    event.json(500, { error: err.message });
  }
};

export const onPost: RequestHandler = async (event) => {
  try {
    let body: any;
    try {
      body = await event.request.json();
    } catch {
      body = await event.parseBody();
    }

    if (!body) {
      event.json(400, { error: "Missing request body" });
      return;
    }

    const { id, name, command, interval_seconds, status } = body;

    // Validation
    if (!id || typeof id !== "string" || id.trim() === "") {
      event.json(400, { error: "Invalid or missing 'id'" });
      return;
    }

    if (!name || typeof name !== "string" || name.trim() === "") {
      event.json(400, { error: "Invalid or missing 'name'" });
      return;
    }

    if (!command || typeof command !== "string" || command.trim() === "") {
      event.json(400, { error: "Invalid or missing 'command'" });
      return;
    }

    const interval = Number(interval_seconds);
    if (isNaN(interval) || !Number.isInteger(interval) || interval <= 0) {
      event.json(400, { error: "Invalid 'interval_seconds', must be an integer greater than 0" });
      return;
    }

    if (status !== "ACTIVE" && status !== "PAUSED") {
      event.json(400, { error: "Invalid 'status', must be either 'ACTIVE' or 'PAUSED'" });
      return;
    }

    // Check if task already exists
    const existing = db.prepare("SELECT id FROM tasks WHERE id = ?").get(id);
    if (existing) {
      event.json(400, { error: `Task with id '${id}' already exists` });
      return;
    }

    // Insert task
    db.prepare(
      "INSERT INTO tasks (id, name, command, interval_seconds, status) VALUES (?, ?, ?, ?, ?)"
    ).run(id, name.trim(), command.trim(), interval, status);

    const createdTask = {
      id,
      name: name.trim(),
      command: command.trim(),
      interval_seconds: interval,
      status,
    };

    event.json(201, createdTask);
  } catch (err: any) {
    event.json(500, { error: err.message });
  }
};
