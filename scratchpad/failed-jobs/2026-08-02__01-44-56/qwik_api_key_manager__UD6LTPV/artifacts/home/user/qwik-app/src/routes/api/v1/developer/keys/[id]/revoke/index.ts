import type { RequestHandler } from '@builder.io/qwik-city';
import { revokeApiKey } from '~/lib/db';

export const onPost: RequestHandler = async (event) => {
  try {
    const id = parseInt(event.params.id, 10);
    if (isNaN(id)) {
      event.json(404, { error: 'Key not found' });
      return;
    }

    const success = revokeApiKey(id);
    if (!success) {
      event.json(404, { error: 'Key not found' });
      return;
    }

    event.json(200, {
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error: any) {
    event.json(500, { error: error.message || 'Internal Server Error' });
  }
};
