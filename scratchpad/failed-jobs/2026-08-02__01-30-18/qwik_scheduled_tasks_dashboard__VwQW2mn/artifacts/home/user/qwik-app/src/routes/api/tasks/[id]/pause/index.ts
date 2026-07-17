import { type RequestHandler } from '@builder.io/qwik-city';
import { getTaskById, updateTaskStatus } from '../../../../../db/db';

export const onPost: RequestHandler = async (event) => {
  try {
    const { id } = event.params;
    const task = getTaskById(id);

    if (!task) {
      event.json(404, { error: `Task with id '${id}' not found` });
      return;
    }

    updateTaskStatus(id, 'PAUSED');

    event.json(200, {
      id,
      status: 'PAUSED',
    });
  } catch (err: any) {
    event.json(500, { error: err.message || 'Internal Server Error' });
  }
};
