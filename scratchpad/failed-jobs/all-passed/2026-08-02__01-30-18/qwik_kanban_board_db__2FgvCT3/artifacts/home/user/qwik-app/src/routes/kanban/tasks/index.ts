import type { RequestHandler } from '@builder.io/qwik-city';
import { db } from '../../../db';

export const onGet: RequestHandler = async ({ json }) => {
  try {
    const tasks = db.prepare('SELECT id, title, column, position FROM tasks ORDER BY column ASC, position ASC').all();
    json(200, tasks);
  } catch (err: any) {
    json(500, { error: err.message });
  }
};
