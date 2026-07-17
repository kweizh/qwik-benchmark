import type { RequestHandler } from '@builder.io/qwik-city';
import db from '../../../../../utils/db';
import { generateApiKey, hashApiKey, getPrefix } from '../../../../../utils/keys';

export const onPost: RequestHandler = async (event) => {
  try {
    const body = await event.parseBody() as any;
    if (!body || typeof body.name !== 'string' || !body.name.trim()) {
      event.json(400, { error: 'Name is required' });
      return;
    }

    const name = body.name.trim();
    const plainKey = generateApiKey();
    const prefix = getPrefix(plainKey);
    const hashed = hashApiKey(plainKey);
    const status = 'active';
    const createdAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO api_keys (name, key_prefix, hashed_key, status, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(name, prefix, hashed, status, createdAt);
    const id = Number(info.lastInsertRowid);

    event.json(201, {
      id,
      name,
      prefix,
      key: plainKey,
      status,
      created_at: createdAt
    });
  } catch (err: any) {
    event.json(500, { error: err.message });
  }
};

export const onGet: RequestHandler = async (event) => {
  try {
    const stmt = db.prepare(`
      SELECT id, name, key_prefix AS prefix, status, created_at
      FROM api_keys
      ORDER BY id DESC
    `);
    const rows = stmt.all();
    event.json(200, rows);
  } catch (err: any) {
    event.json(500, { error: err.message });
  }
};
