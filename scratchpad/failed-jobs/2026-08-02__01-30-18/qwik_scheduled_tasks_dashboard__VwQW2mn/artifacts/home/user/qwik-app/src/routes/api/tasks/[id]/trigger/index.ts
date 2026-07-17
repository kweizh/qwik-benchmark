import { type RequestHandler } from '@builder.io/qwik-city';
import { getTaskById } from '../../../../../db/db';
import { executeTaskCommand } from '../../../../../runner/runner';

export const onPost: RequestHandler = async (event) => {
  try {
    const { id } = event.params;
    const task = getTaskById(id);

    if (!task) {
      event.json(404, { error: `Task with id '${id}' not found` });
      return;
    }

    // Trigger immediately in the background
    executeTaskCommand(task.id, task.command);

    event.json(200, {
      id,
      triggered: true,
    });
  } catch (err: any) {
    event.json(500, { error: err.message || 'Internal Server Error' });
  }
};
