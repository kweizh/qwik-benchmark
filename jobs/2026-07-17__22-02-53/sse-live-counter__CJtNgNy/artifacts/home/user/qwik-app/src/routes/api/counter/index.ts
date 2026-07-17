import type { RequestHandler } from '@builder.io/qwik-city';
import { getCount, updateCount } from '../../../server/counter-state';

export const onGet: RequestHandler = async (requestEvent) => {
  requestEvent.json(200, { count: getCount() });
};

export const onPost: RequestHandler = async (requestEvent) => {
  const body = await requestEvent.parseBody();
  
  let delta = 0;
  if (body && typeof body === 'object' && 'delta' in body) {
    delta = Number((body as any).delta);
  }

  if (isNaN(delta)) {
    requestEvent.json(400, { error: 'Invalid delta' });
    return;
  }

  const newCount = updateCount(delta);
  requestEvent.json(200, { count: newCount });
};
