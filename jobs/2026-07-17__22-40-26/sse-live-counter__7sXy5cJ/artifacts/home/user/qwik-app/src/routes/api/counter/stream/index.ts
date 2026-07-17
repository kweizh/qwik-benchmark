// SSE streaming endpoint: GET /api/counter/stream
//
// On connect we register the response writer with the shared counter
// registry, immediately push the current value as one SSE frame, then keep
// the connection open. Every time another client mutates the counter, the
// POST endpoint broadcasts the new value to every registered writer,
// including ours, so the browser sees each change live.
//
// On disconnect (client navigation away, network drop, explicit close) we
// remove the writer from the registry so a future broadcast doesn't try to
// write to a dead stream.
import type { RequestHandler } from "@builder.io/qwik-city";
import {
  addSubscriber,
  encodeSseFrame,
  getCount,
  type CounterWriter,
} from "~/lib/counter";

export const onGet: RequestHandler = async (requestEvent) => {
  // SSE-specific response headers. `text/event-stream` is the Content-Type
  // the EventSource API in the browser requires to accept the response.
  requestEvent.headers.set("Content-Type", "text/event-stream");
  requestEvent.headers.set("Cache-Control", "no-cache, no-transform");
  requestEvent.headers.set("Connection", "keep-alive");
  // Tell reverse proxies (Nginx in particular) not to buffer this stream,
  // so frames reach the browser without waiting for a buffer to fill.
  requestEvent.headers.set("X-Accel-Buffering", "no");
  requestEvent.status(200);

  // Get the writable half of the response. Qwik City returns a web-standard
  // WritableStream; we grab its default writer and hand a small adapter to
  // the broadcaster. The handler returns after this, but the response stays
  // open as long as the writer is held and the request is not aborted, so
  // subsequent `writer.write()` calls deliver straight to the socket.
  const writable = requestEvent.getWritableStream();
  const writer = writable.getWriter();

  const counterWriter: CounterWriter = {
    async write(chunk: Uint8Array): Promise<void> {
      await writer.write(chunk);
    },
  };

  // Register with the broadcaster's registry of active subscribers. The
  // returned `unsubscribe` is idempotent and is invoked from the abort
  // listener below when the client disconnects.
  const unsubscribe = addSubscriber(counterWriter);

  // Send the current value right after registering so a freshly connected
  // client receives the latest counter without waiting for the next
  // mutation. Doing it after `addSubscriber` ensures that a broadcast that
  // races us still reaches this connection (the new value will arrive as a
  // subsequent frame).
  try {
    await writer.write(encodeSseFrame({ count: getCount() }));
  } catch {
    // The client may have already aborted between getting the writer and
    // writing the initial frame; in that case just clean up and bail.
    unsubscribe();
    return;
  }

  // Hook the disconnect signal. When the browser cancels the EventSource
  // (navigation, tab close, network drop) Qwik City aborts `requestEvent.signal`,
  // which lets us drop the dead writer from the registry.
  requestEvent.signal.addEventListener("abort", () => {
    unsubscribe();
    // Releasing the writer lets the underlying WritableStream close, which
    // causes Qwik City to finalize the response. It's safe to call more
    // than once; the inner try/catch absorbs the double-release.
    try {
      writer.releaseLock();
    } catch {
      // Already released.
    }
  });
};
