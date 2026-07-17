import type { RequestHandler } from "@builder.io/qwik-city";
import { encodeCountFrame, subscribe, unsubscribe } from "~/lib/counter-store.server";

// GET /api/counter/stream -> text/event-stream of { "count": <integer> }
// frames. Emits the current value immediately on connect, then emits again
// every time the shared counter changes (broadcast from the mutation
// endpoint).
export const onGet: RequestHandler = async (requestEvent) => {
  requestEvent.headers.set("Content-Type", "text/event-stream");
  requestEvent.headers.set("Cache-Control", "no-cache, no-transform");
  requestEvent.headers.set("Connection", "keep-alive");
  requestEvent.headers.set("X-Accel-Buffering", "no");

  const stream = requestEvent.getWritableStream();
  const writer = stream.getWriter();

  // Register this connection and immediately emit the current value.
  const initialCount = subscribe(writer);
  await writer.write(encodeCountFrame(initialCount));

  const cleanup = () => {
    unsubscribe(writer);
    writer.close().catch(() => {
      // Connection may already be closed/aborted; ignore.
    });
  };

  // Remove the subscriber (and close the writer) once the client
  // disconnects / aborts the request.
  requestEvent.signal.addEventListener("abort", cleanup);
};
