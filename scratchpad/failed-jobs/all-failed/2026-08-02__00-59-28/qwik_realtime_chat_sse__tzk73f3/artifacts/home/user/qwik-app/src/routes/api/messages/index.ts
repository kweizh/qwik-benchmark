import type { RequestHandler } from "@builder.io/qwik-city";
import { getAllMessages, insertMessage, type Message } from "../../../lib/db";

// Store active SSE connections
const clients: Set<ReadableStreamDefaultController> = new Set();

function broadcast(message: Message) {
  const data = `data: ${JSON.stringify(message)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);

  for (const controller of clients) {
    try {
      controller.enqueue(encoded);
    } catch {
      clients.delete(controller);
    }
  }
}

export const onGet: RequestHandler = async ({ send, request }) => {
  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);

      // Send all existing messages upon connection
      const messages = getAllMessages();
      const encoder = new TextEncoder();
      for (const msg of messages) {
        const data = `data: ${JSON.stringify(msg)}\n\n`;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          clients.delete(controller);
          return;
        }
      }
    },
    cancel(controller) {
      clients.delete(controller);
    },
  });

  send(
    new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  );
};

export const onPost: RequestHandler = async ({ request, json }) => {
  let body: { user?: string; text?: string };

  try {
    body = await request.json();
  } catch {
    json(400, { error: "Invalid JSON" });
    return;
  }

  const { user, text } = body;

  if (
    !user ||
    !text ||
    typeof user !== "string" ||
    typeof text !== "string" ||
    user.trim() === "" ||
    text.trim() === ""
  ) {
    json(400, { error: "user and text are required and must be non-empty strings" });
    return;
  }

  const message = insertMessage(user.trim(), text.trim());
  broadcast(message);

  json(201, message);
};
