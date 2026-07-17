import type { RequestHandler } from '@builder.io/qwik-city';
import { db } from '../../../lib/db';

export const onGet: RequestHandler = async ({ json }) => {
  try {
    const rows = db.prepare('SELECT id, name, size, mime, tag FROM files').all();
    json(200, rows);
  } catch (error: any) {
    json(500, { error: error.message || 'An error occurred while listing files' });
  }
};
