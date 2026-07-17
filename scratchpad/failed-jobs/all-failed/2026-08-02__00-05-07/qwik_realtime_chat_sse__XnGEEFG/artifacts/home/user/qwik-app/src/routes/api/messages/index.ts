import type { RequestHandler } from "@builder.io/qwik-city";
import {
  broadcast,
  getAllMessages,
  insertMessage,
  subscribe,
  type ChatMessage,
} from "~/lib/db";

function encodeMessage(message: ChatMessage): Uint8Array {
  const payload = `data: ${JSON.stringify(message)}\n\n`;
  return new TextEncoder().encode(payload);
}

/** GET /api/messages - Establishes a persistent SSE stream of chat messages. */
export const onGet: RequestHandler = async (requestEvent) => {
  requestEvent.headers.set("Content-Type", "text/event-stream");
  requestEvent.headers.set("Cache-Control", "no-cache");
  requestEvent.headers.set("Connection", "keep-alive");

  // Prevent Qwik City / proxies from buffering or compressing the stream.
  requestEvent.headers.set("X-Accel-Buffering", "no");

  const writableStream = requestEvent.getWritableStream();
  const writer = writableStream.getWriter();

  // Immediately stream all existing messages.
  const existingMessages = getAllMessages();
  for (const message of existingMessages) {
    await writer.write(encodeMessage(message));
  }

  // Broadcast any newly posted messages to this connection.
  const unsubscribe = subscribe((message) => {
    writer.write(encodeMessage(message)).catch(() => {
      // Connection likely closed; ignore write errors.
    });
  });

  const cleanup = () => {
    unsubscribe();
    writer.close().catch(() => {
      // already closed
    });
  };

  requestEvent.signal.addEventListener("abort", cleanup);
};

/** POST /api/messages - Persists a new chat message and broadcasts it to all SSE clients. */
export const onPost: RequestHandler = async (requestEvent) => {
  let body: unknown;
  try {
    body = await requestEvent.parseBody();
  } catch {
    throw requestEvent.json(400, { error: "Invalid JSON body" });
  }

  const { user, text } = (body ?? {}) as Record<string, unknown>;

  if (
    typeof user !== "string" ||
    typeof text !== "string" ||
    user.trim().length === 0 ||
    text.trim().length === 0
  ) {
    throw requestEvent.json(400, {
      error: "Both 'user' and 'text' are required non-empty strings.",
    });
  }

  const message = insertMessage(user, text);
  broadcast(message);

  throw requestEvent.json(201, message);
};
