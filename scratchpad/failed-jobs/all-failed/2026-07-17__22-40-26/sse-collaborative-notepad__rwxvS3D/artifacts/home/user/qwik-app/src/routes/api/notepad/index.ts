import type { RequestHandler } from "@builder.io/qwik-city";
import {
  broadcastUpdate,
  getText,
  subscribe,
  type Subscriber,
} from "~/lib/notepad-hub";

// GET /api/notepad — opens a long-lived Server-Sent Events stream.
// On connect it emits a single `snapshot` event with the current document
// text, then forwards every subsequent edit as an `update` event.
export const onGet: RequestHandler = async (requestEvent) => {
  const encoder = new TextEncoder();

  // SSE requires these response headers. `X-Accel-Buffering: no` disables
  // any reverse-proxy buffering that would otherwise hold events back.
  requestEvent.headers.set("Content-Type", "text/event-stream");
  requestEvent.headers.set("Cache-Control", "no-cache, no-transform");
  requestEvent.headers.set("Connection", "keep-alive");
  requestEvent.headers.set("X-Accel-Buffering", "no");
  requestEvent.status(200);

  const writableStream = requestEvent.getWritableStream();
  const writer = writableStream.getWriter();

  let closed = false;
  const writeSafely = async (chunk: string): Promise<void> => {
    if (closed) return;
    await writer.write(encoder.encode(chunk));
  };
  const closeSafely = async (): Promise<void> => {
    if (closed) return;
    closed = true;
    try {
      await writer.close();
    } catch {
      // Stream may already be closed by the runtime; that's fine.
    }
  };

  const subscriber: Subscriber = {
    write: writeSafely,
    close: closeSafely,
  };

  const unsubscribe = subscribe(subscriber);

  // Cleanup on disconnect: the runtime fires `signal` (`requestEvent.signal`
  // and `requestEvent.request.signal` are the same) when the client goes
  // away, including when the response stream errors out.
  const cleanup = () => {
    unsubscribe();
    void closeSafely();
  };
  requestEvent.signal.addEventListener("abort", cleanup);

  // Send the initial snapshot before anything else so connecting clients
  // always receive the latest stored text as the very first message.
  const snapshotMessage =
    "event: snapshot\n" +
    "data: " +
    JSON.stringify({ text: getText() }) +
    "\n\n";
  try {
    await writer.write(encoder.encode(snapshotMessage));
  } catch {
    cleanup();
    return;
  }
};

// POST /api/notepad — accepts an edit, updates the stored document text,
// broadcasts it to all connected SSE clients, and acknowledges with JSON.
export const onPost: RequestHandler = async (requestEvent) => {
  const body = (await requestEvent.parseBody()) as
    | { text?: unknown; clientId?: unknown }
    | null
    | undefined;

  const text = typeof body?.text === "string" ? body.text : "";
  const clientId = typeof body?.clientId === "string" ? body.clientId : "";

  await broadcastUpdate(text, clientId);

  requestEvent.json(200, { ok: true });
};
