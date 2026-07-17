import type { RequestHandler } from "@builder.io/qwik-city";
import {
  broadcast,
  getDocumentText,
  setDocumentText,
  subscribe,
} from "../../../server/notepad-hub";

/**
 * GET /api/notepad
 *
 * Opens a long-lived Server-Sent Events stream. Immediately upon connection it
 * emits a single `snapshot` event carrying the latest document text, then it
 * forwards every subsequent edit (broadcast by POST below) as an `update`
 * event. The connection stays open until the client disconnects, at which
 * point the subscriber is removed and the stream is closed.
 */
export const onGet: RequestHandler = async ({
  headers,
  getWritableStream,
  signal,
}) => {
  // SSE response headers. `no-transform` asks intermediaries not to alter the
  // stream and `X-Accel-Buffering: no` disables buffering on nginx.
  headers.set("Content-Type", "text/event-stream");
  headers.set("Cache-Control", "no-cache, no-transform");
  headers.set("Connection", "keep-alive");
  headers.set("X-Accel-Buffering", "no");

  const stream = getWritableStream();
  const writer = stream.getWriter();
  const encoder = new TextEncoder();

  const writeEvent = (raw: string): void => {
    writer.write(encoder.encode(raw));
  };

  // 1. Immediately send the current document text as a `snapshot` event.
  writeEvent(
    `event: snapshot\ndata: ${JSON.stringify({ text: getDocumentText() })}\n\n`,
  );

  // 2. Forward every broadcast edit to this client as an `update` event.
  const unsubscribe = subscribe((event) => {
    if (event.type === "update") {
      writeEvent(
        `event: update\ndata: ${JSON.stringify({
          text: event.text,
          clientId: event.clientId,
        })}\n\n`,
      );
    }
  });

  // 3. Keep the connection open until the client disconnects. The request's
  //    AbortSignal fires when the underlying socket closes.
  await new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
    } else {
      signal.addEventListener("abort", () => resolve(), { once: true });
    }
  });

  // 4. Clean up: stop receiving broadcasts and close the stream.
  unsubscribe();
  await writer.close().catch(() => {
    /* the stream may already be closed when the client disconnected */
  });
};

/**
 * POST /api/notepad
 *
 * Accepts a JSON edit `{"text": string, "clientId": string}`, updates the
 * server-held document text, broadcasts an `update` event carrying that same
 * text and clientId to all connected SSE clients, and responds with
 * HTTP 200 and body `{"ok": true}`.
 */
export const onPost: RequestHandler = async ({ parseBody, json }) => {
  const body = (await parseBody()) as
    | { text?: unknown; clientId?: unknown }
    | null;

  const text = typeof body?.text === "string" ? body.text : "";
  const clientId = typeof body?.clientId === "string" ? body.clientId : "";

  // Update the stored document text.
  setDocumentText(text);

  // Broadcast the edit to every connected SSE client.
  broadcast({ type: "update", text, clientId });

  // Acknowledge the edit.
  json(200, { ok: true });
};