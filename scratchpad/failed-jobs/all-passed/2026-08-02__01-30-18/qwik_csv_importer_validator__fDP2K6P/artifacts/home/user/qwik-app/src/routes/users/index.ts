import type { RequestHandler } from '@builder.io/qwik-city';
import { getDB } from '../../lib/db';

export const onGet: RequestHandler = async ({ json }) => {
  try {
    const db = getDB();
    const users = db.prepare('SELECT id, name, email, age FROM users ORDER BY id ASC').all();
    json(200, users);
  } catch (error: any) {
    json(500, {
      error: error?.message || "An unexpected error occurred while retrieving users"
    });
  }
};
