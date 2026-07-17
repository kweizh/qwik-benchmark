import type { RequestHandler } from '@builder.io/qwik-city';

export const onGet: RequestHandler = async ({ query, json }) => {
  const delayMs = parseInt(query.get('delay') || '0', 10) || 0;
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  json(200, { delayed: true, delay: delayMs });
};
