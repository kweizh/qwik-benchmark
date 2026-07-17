import type { RequestHandler } from "@builder.io/qwik-city";
import {
  addSubscriber,
  removeSubscriber,
  getCount,
  frame,
  type Subscriber,
} from "~/server/counter-store";

/**
 * SSE stream endpoint: `GET /api/counter/stream`
 *
 * On connection it immediately emits one frame carrying the current counter
 * value, then keeps the connection open and streams a new frame every time
 * the shared counter changes (broadcast from the mutation endpoint).
 *
 * The subscriber's writer is removed from the registry when the request
 * aborts (client disconnects).
 */
export const onGet: RequestHandler = async (requestEvent) => {
  const { headers, signal, getWritableStream } = requestEvent;

  // SSE response headers.
  headers.set("Content-Type", "text/event-stream; charset=utf-8");
  headers.set("Cache-Control", "no-cache, no-transform");
  headers.set("Connection", "keep-alive");
  headers.set("X-Accel-Buffering", "no");

  const stream = getWritableStream();
  const writer = stream.getWriter();

  const subscriber: Subscriber = {
    send(count: number) {
      // writer.write may throw if the stream is closed/errored.
      writer.write(frame(count));
    },
    close() {
      removeSubscriber(subscriber);
      try {
        writer.close();
      } catch {
        // Already closed.
      }
    },
  };

  // Register so this connection receives all future broadcasts.
  addSubscriber(subscriber);

  // Immediately emit the current counter value to the newly connected client.
  try {
    writer.write(frame(getCount()));
  } catch {
    subscriber.close();
    return;
  }

  // Remove the subscriber when the client disconnects / request aborts.
  signal.addEventListener("abort", () => {
    subscriber.close();
  });

  // Hold the endpoint open until the stream closes. The promise resolves when
  // the writer is closed (e.g. via the abort handler above).
  await new Promise<void>((resolve) => {
    signal.addEventListener("abort", () => resolve(), { once: true });
    writer.closed.then(() => resolve()).catch(() => resolve());
  });
};