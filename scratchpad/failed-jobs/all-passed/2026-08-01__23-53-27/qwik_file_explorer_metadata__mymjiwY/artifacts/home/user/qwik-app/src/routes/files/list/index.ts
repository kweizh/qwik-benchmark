import type { RequestHandler } from '@builder.io/qwik-city';
import db from '../../../db';

export const onGet: RequestHandler = async (event) => {
  try {
    const stmt = db.prepare('SELECT id, name, size, mime, tag FROM files');
    const rows = stmt.all();
    event.json(200, rows);
  } catch (err: any) {
    event.json(500, { error: err.message || 'An error occurred while listing files' });
  }
};
