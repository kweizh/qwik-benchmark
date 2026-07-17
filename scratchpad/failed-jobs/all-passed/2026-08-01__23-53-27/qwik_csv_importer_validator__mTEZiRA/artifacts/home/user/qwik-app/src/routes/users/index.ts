import { type RequestHandler } from '@builder.io/qwik-city';
import { getDb, dbAll } from '../../utils/db';

interface UserRow {
  id: number;
  name: string;
  email: string;
  age: number;
}

export const onGet: RequestHandler = async (event) => {
  try {
    const db = await getDb();
    const users = await dbAll<UserRow>(db, 'SELECT id, name, email, age FROM users ORDER BY id ASC');
    event.json(200, users);
  } catch (err: any) {
    event.json(500, {
      error: err.message || "Failed to retrieve users"
    });
  }
};
