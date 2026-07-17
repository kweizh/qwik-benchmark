import { type RequestHandler } from '@builder.io/qwik-city';
import { getTaskById, getExecutionHistory } from '../../../../../db/db';

export const onGet: RequestHandler = async (event) => {
  try {
    const { id } = event.params;
    const task = getTaskById(id);

    if (!task) {
      event.json(404, { error: `Task with id '${id}' not found` });
      return;
    }

    const history = getExecutionHistory(id);
    event.json(200, history);
  } catch (err: any) {
    event.json(500, { error: err.message || 'Internal Server Error' });
  }
};
