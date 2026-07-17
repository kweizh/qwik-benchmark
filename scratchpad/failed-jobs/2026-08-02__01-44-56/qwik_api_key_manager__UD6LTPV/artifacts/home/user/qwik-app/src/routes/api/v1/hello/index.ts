import type { RequestHandler } from '@builder.io/qwik-city';
import { verifyApiKey } from '~/lib/db';

export const onGet: RequestHandler = async (event) => {
  try {
    const apiKey = event.request.headers.get('x-api-key') || event.request.headers.get('X-API-Key');
    if (!apiKey) {
      event.json(401, { error: 'Unauthorized' });
      return;
    }

    const isValid = verifyApiKey(apiKey);
    if (!isValid) {
      event.json(401, { error: 'Unauthorized' });
      return;
    }

    event.json(200, {
      message: 'Hello, authenticated developer!',
    });
  } catch (error: any) {
    event.json(500, { error: error.message || 'Internal Server Error' });
  }
};
