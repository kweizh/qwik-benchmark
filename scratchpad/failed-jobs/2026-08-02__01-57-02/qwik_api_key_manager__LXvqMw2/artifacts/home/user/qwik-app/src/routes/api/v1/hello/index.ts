import type { RequestHandler } from '@builder.io/qwik-city';
import db from '../../../../utils/db';
import { hashApiKey } from '../../../../utils/keys';

export const onGet: RequestHandler = async (event) => {
  try {
    const apiKey = event.request.headers.get('X-API-Key');

    if (!apiKey || !apiKey.startsWith('qk_')) {
      event.json(401, { error: 'Unauthorized' });
      return;
    }

    const hashed = hashApiKey(apiKey);
    const stmt = db.prepare("SELECT status FROM api_keys WHERE hashed_key = ?");
    const row = stmt.get(hashed) as { status: string } | undefined;

    if (!row || row.status !== 'active') {
      event.json(401, { error: 'Unauthorized' });
      return;
    }

    event.json(200, {
      message: 'Hello, authenticated developer!'
    });
  } catch (err: any) {
    event.json(500, { error: err.message });
  }
};
