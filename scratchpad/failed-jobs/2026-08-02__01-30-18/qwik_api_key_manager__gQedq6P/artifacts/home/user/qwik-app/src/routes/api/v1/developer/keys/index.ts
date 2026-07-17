import type { RequestHandler } from '@builder.io/qwik-city';
import db, { generateApiKey, hashApiKey } from '../../../../../lib/db';

export const onPost: RequestHandler = async ({ request, json }) => {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      json(400, { error: 'Invalid JSON body' });
      return;
    }

    if (!body || typeof body.name !== 'string' || body.name.trim() === '') {
      json(400, { error: 'Name is required' });
      return;
    }

    const name = body.name.trim();
    const plainTextKey = generateApiKey();
    const keyPrefix = plainTextKey.slice(0, 7);
    const hashedKey = hashApiKey(plainTextKey);
    const createdAt = new Date().toISOString();
    const statusVal = 'active';

    const stmt = db.prepare(`
      INSERT INTO api_keys (name, key_prefix, hashed_key, status, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(name, keyPrefix, hashedKey, statusVal, createdAt);
    const id = Number(info.lastInsertRowid);

    json(201, {
      id,
      name,
      prefix: keyPrefix,
      key: plainTextKey,
      status: statusVal,
      created_at: createdAt
    });
  } catch (error: any) {
    json(500, { error: error.message || 'Internal Server Error' });
  }
};

export const onGet: RequestHandler = async ({ json }) => {
  try {
    const stmt = db.prepare(`
      SELECT id, name, key_prefix AS prefix, status, created_at
      FROM api_keys
      ORDER BY id DESC
    `);
    const rows = stmt.all();
    json(200, rows);
  } catch (error: any) {
    json(500, { error: error.message || 'Internal Server Error' });
  }
};
