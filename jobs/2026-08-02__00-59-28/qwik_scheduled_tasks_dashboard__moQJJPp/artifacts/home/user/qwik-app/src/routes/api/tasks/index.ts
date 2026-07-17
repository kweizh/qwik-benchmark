import type { RequestHandler } from "@builder.io/qwik-city";
import { getAllTasks, createTask } from "../../../db";
import { startRunner } from "../../../runner";

export const onGet: RequestHandler = async ({ json }) => {
  const tasks = getAllTasks();
  json(200, tasks);
};

export const onPost: RequestHandler = async ({ request, json }) => {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.id || typeof body.id !== "string") {
      json(400, { error: "Field 'id' is required and must be a string" });
      return;
    }
    if (!body.name || typeof body.name !== "string") {
      json(400, { error: "Field 'name' is required and must be a string" });
      return;
    }
    if (!body.command || typeof body.command !== "string") {
      json(400, { error: "Field 'command' is required and must be a string" });
      return;
    }
    if (
      !body.interval_seconds ||
      typeof body.interval_seconds !== "number" ||
      body.interval_seconds <= 0 ||
      !Number.isInteger(body.interval_seconds)
    ) {
      json(400, {
        error:
          "Field 'interval_seconds' is required and must be a positive integer",
      });
      return;
    }
    if (
      !body.status ||
      (body.status !== "ACTIVE" && body.status !== "PAUSED")
    ) {
      json(400, {
        error: "Field 'status' must be either 'ACTIVE' or 'PAUSED'",
      });
      return;
    }

    const task = {
      id: body.id,
      name: body.name,
      command: body.command,
      interval_seconds: body.interval_seconds,
      status: body.status,
    };

    createTask(task);
    json(201, task);
  } catch (e) {
    json(400, { error: "Invalid JSON body" });
  }
};
