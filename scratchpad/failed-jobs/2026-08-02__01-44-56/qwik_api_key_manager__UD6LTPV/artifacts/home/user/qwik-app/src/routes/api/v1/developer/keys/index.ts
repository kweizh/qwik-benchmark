import type { RequestHandler } from '@builder.io/qwik-city';
import { createApiKey, listApiKeys } from '~/lib/db';

export const onPost: RequestHandler = async (event) => {
  try {
    const body = (await event.parseBody()) as { name?: string } | null;
    if (!body || typeof body.name !== 'string' || body.name.trim() === '') {
      event.json(400, { error: 'Name is required' });
      return;
    }

    const { row, plainTextKey } = createApiKey(body.name.trim());

    event.json(201, {
      id: row.id,
      name: row.name,
      prefix: row.key_prefix,
      key: plainTextKey,
      status: row.status,
      created_at: row.created_at,
    });
  } catch (error: any) {
    event.json(500, { error: error.message || 'Internal Server Error' });
  }
};

export const onGet: RequestHandler = async (event) => {
  try {
    const keys = listApiKeys();
    const response = keys.map((k) => ({
      id: keys.length > 0 ? k.id : undefined, // just to be safe, but k.id is always there
      name: k.name,
      prefix: k.key_prefix,
      status: k.status,
      created_at: k.created_at,
    })).filter(k => k.id !== undefined);

    event.json(200, response);
  } catch (error: any) {
    event.json(500, { error: error.message || 'Internal Server Error' });
  }
};
