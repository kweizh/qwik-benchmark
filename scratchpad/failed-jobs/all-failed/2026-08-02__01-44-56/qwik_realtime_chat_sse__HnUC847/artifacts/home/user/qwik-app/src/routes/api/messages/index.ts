import type { RequestHandler } from "@builder.io/qwik-city";
import { getAllMessages, insertMessage } from "~/lib/db";
import { addClient, removeClient, broadcastMessage } from "~/lib/sse";

export const onGet: RequestHandler = async ({
  status,
  headers,
  getWritableStream,
  signal,
}) => {
  status(200);
  headers.set("Content-Type", "text/event-stream");
  headers.set("Cache-Control", "no-cache");
  headers.set("Connection", "keep-alive");

  const writableStream = getWritableStream();
  const writer = writableStream.getWriter();
  const encoder = new TextEncoder();

  const clientId = Math.random().toString(36).substring(2);

  const client = {
    id: clientId,
    write: async (data: string) => {
      await writer.write(encoder.encode(data));
    },
    close: () => {
      writer.close().catch(() => {});
    },
  };

  addClient(client);

  // Send existing messages immediately
  try {
    const messages = getAllMessages();
    for (const msg of messages) {
      await client.write(`data: ${JSON.stringify(msg)}\n\n`);
    }
  } catch (err) {
    console.error("Error sending initial messages:", err);
    removeClient(clientId);
    return;
  }

  // Keep the connection open until aborted
  return new Promise<void>((resolve) => {
    signal.addEventListener("abort", () => {
      removeClient(clientId);
      resolve();
    });
  });
};

export const onPost: RequestHandler = async ({ parseBody, status, json }) => {
  let body: any;
  try {
    body = await parseBody();
  } catch {
    status(400);
    json(400, { error: "Invalid request body" });
    return;
  }

  if (
    !body ||
    typeof body !== "object" ||
    typeof body.user !== "string" ||
    typeof body.text !== "string" ||
    body.user.trim() === "" ||
    body.text.trim() === ""
  ) {
    status(400);
    json(400, {
      error: 'Bad Request: "user" and "text" must be non-empty strings.',
    });
    return;
  }

  try {
    const savedMessage = insertMessage(body.user.trim(), body.text.trim());
    broadcastMessage(savedMessage);

    status(201);
    json(201, savedMessage);
  } catch (err) {
    console.error("Failed to save message:", err);
    status(500);
    json(500, { error: "Internal Server Error" });
  }
};
