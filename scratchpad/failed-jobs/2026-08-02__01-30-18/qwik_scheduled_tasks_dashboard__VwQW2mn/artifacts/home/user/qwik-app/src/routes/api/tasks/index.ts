import { type RequestHandler } from '@builder.io/qwik-city';
import { getAllTasks, createTask, getTaskById, Task } from '../../../db/db';

export const onGet: RequestHandler = async (event) => {
  try {
    const tasks = getAllTasks();
    event.json(200, tasks);
  } catch (err: any) {
    event.json(500, { error: err.message || 'Internal Server Error' });
  }
};

export const onPost: RequestHandler = async (event) => {
  try {
    let body: any;
    try {
      body = await event.request.json();
    } catch (e) {
      event.json(400, { error: 'Invalid JSON body' });
      return;
    }

    const { id, name, command, interval_seconds, status } = body;

    // Validation
    if (!id || typeof id !== 'string' || id.trim() === '') {
      event.json(400, { error: 'id is required and must be a non-empty string' });
      return;
    }
    if (!name || typeof name !== 'string' || name.trim() === '') {
      event.json(400, { error: 'name is required and must be a non-empty string' });
      return;
    }
    if (!command || typeof command !== 'string' || command.trim() === '') {
      event.json(400, { error: 'command is required and must be a non-empty string' });
      return;
    }
    if (
      interval_seconds === undefined ||
      typeof interval_seconds !== 'number' ||
      interval_seconds <= 0
    ) {
      event.json(400, { error: 'interval_seconds is required and must be a positive number' });
      return;
    }
    if (status !== 'ACTIVE' && status !== 'PAUSED') {
      event.json(400, { error: "status is required and must be either 'ACTIVE' or 'PAUSED'" });
      return;
    }

    // Check for duplicate ID
    const existing = getTaskById(id);
    if (existing) {
      event.json(400, { error: `Task with id '${id}' already exists` });
      return;
    }

    const newTask: Task = {
      id,
      name,
      command,
      interval_seconds,
      status,
    };

    createTask(newTask);

    event.json(201, newTask);
  } catch (err: any) {
    event.json(500, { error: err.message || 'Internal Server Error' });
  }
};
