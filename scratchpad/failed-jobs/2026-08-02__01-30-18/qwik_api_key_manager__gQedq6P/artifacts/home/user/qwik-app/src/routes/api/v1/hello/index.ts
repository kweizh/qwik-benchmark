import type { RequestHandler } from '@builder.io/qwik-city';
import db, { hashApiKey } from '../../../../lib/db';

export const onGet: RequestHandler = async ({ request, json }) => {
  try {
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('x-api-key');
    if (!apiKey) {
      json(401, { error: 'Unauthorized' });
      return;
    }

    // Verify prefix and length
    if (!apiKey.startsWith('qk_') || apiKey.length !== 35) {
      json(401, { error: 'Unauthorized' });
      return;
    }

    const hashedKey = hashApiKey(apiKey);
    const stmt = db.prepare(`
      SELECT status FROM api_keys WHERE hashed_key = ?
    `);
    const row = stmt.get(hashedKey) as { status: string } | undefined;

    if (!row || row.status !== 'active') {
      json(401, { error: 'Unauthorized' });
      return;
    }

    json(200, {
      message: 'Hello, authenticated developer!'
    });
  } catch (error: any) {
    json(500, { error: error.message || 'Internal Server Error' });
  }
};
