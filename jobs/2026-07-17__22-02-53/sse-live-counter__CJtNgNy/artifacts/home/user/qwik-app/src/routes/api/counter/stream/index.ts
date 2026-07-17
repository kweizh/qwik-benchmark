import type { RequestHandler } from '@builder.io/qwik-city';
import { addSubscriber, removeSubscriber, getCount } from '../../../../server/counter-state';

export const onGet: RequestHandler = async (requestEvent) => {
  requestEvent.headers.set('Content-Type', 'text/event-stream');
  requestEvent.headers.set('Cache-Control', 'no-cache, no-transform');
  requestEvent.headers.set('Connection', 'keep-alive');

  const writableStream = requestEvent.getWritableStream();
  const writer = writableStream.getWriter();

  addSubscriber(writer);

  const initialCount = getCount();
  const encoder = new TextEncoder();
  const message = `data: ${JSON.stringify({ count: initialCount })}\n\n`;

  try {
    await writer.write(encoder.encode(message));
  } catch (err) {
    console.error('Failed to write initial SSE frame, removing subscriber:', err);
    removeSubscriber(writer);
    try {
      writer.close();
    } catch {
      // Already closed
    }
    return;
  }

  // Return a promise that resolves only when the request is aborted
  await new Promise<void>((resolve) => {
    const onAbort = () => {
      removeSubscriber(writer);
      try {
        writer.close();
      } catch {
        // Already closed
      }
      requestEvent.signal.removeEventListener('abort', onAbort);
      resolve();
    };

    if (requestEvent.signal.aborted) {
      onAbort();
    } else {
      requestEvent.signal.addEventListener('abort', onAbort);
    }
  });
};
