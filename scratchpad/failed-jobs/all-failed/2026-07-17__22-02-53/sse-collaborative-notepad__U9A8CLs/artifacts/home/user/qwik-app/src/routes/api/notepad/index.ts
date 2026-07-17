import type { RequestHandler } from "@builder.io/qwik-city";
import { hub } from "./hub";

export const onGet: RequestHandler = async (requestEvent) => {
  requestEvent.headers.set("Content-Type", "text/event-stream");
  requestEvent.headers.set("Cache-Control", "no-cache");
  requestEvent.headers.set("Connection", "keep-alive");

  const writableStream = requestEvent.getWritableStream();
  const writer = writableStream.getWriter();
  const encoder = new TextEncoder();

  // Send the initial snapshot event
  const snapshotMessage = `event: snapshot\ndata: ${JSON.stringify({ text: hub.text })}\n\n`;
  await writer.write(encoder.encode(snapshotMessage));

  let resolvePromise: () => void;
  const donePromise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });

  // Subscribe to hub updates
  const unsubscribe = hub.subscribe((sseMessage) => {
    writer.write(encoder.encode(sseMessage)).catch(() => {
      // Ignore write errors (e.g. if connection closed)
    });
  });

  const cleanup = () => {
    unsubscribe();
    try {
      writer.close();
    } catch {
      // Ignore
    }
    resolvePromise();
  };

  requestEvent.signal.addEventListener("abort", cleanup);

  if (requestEvent.signal.aborted) {
    cleanup();
  }

  await donePromise;
};

export const onPost: RequestHandler = async (requestEvent) => {
  const body = (await requestEvent.parseBody()) as { text?: unknown; clientId?: unknown } | null;
  if (!body || typeof body.text !== "string" || typeof body.clientId !== "string") {
    requestEvent.status(400);
    requestEvent.json(400, { error: "Invalid request body" });
    return;
  }

  const { text, clientId } = body;
  hub.text = text;

  // Broadcast update event to all subscribers
  const sseMessage = `event: update\ndata: ${JSON.stringify({ text, clientId })}\n\n`;
  hub.broadcast(sseMessage);

  requestEvent.status(200);
  requestEvent.json(200, { ok: true });
};
