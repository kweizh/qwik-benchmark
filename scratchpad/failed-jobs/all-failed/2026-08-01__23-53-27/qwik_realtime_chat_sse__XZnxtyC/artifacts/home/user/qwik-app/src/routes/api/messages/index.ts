import type { RequestEvent } from "@builder.io/qwik-city";
import { getAllMessages, insertMessage, type Message } from "../../../db";

interface Client {
  send: (msg: Message) => Promise<void>;
  close: () => Promise<void>;
}

// Store active clients globally (persists across Vite hot reloads)
const activeClients = ((globalThis as any).activeClients || new Set<Client>()) as Set<Client>;
(globalThis as any).activeClients = activeClients;

export const onGet = async (requestEv: RequestEvent) => {
  requestEv.headers.set("Content-Type", "text/event-stream");
  requestEv.headers.set("Cache-Control", "no-cache");
  requestEv.headers.set("Connection", "keep-alive");

  const stream = requestEv.getWritableStream();
  const writer = stream.getWriter();
  const encoder = new TextEncoder();

  // Fetch existing messages and stream immediately
  try {
    const messages = await getAllMessages();
    for (const msg of messages) {
      await writer.write(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
    }
  } catch (err) {
    console.error("Error writing initial messages to SSE stream:", err);
  }

  const client: Client = {
    send: async (msg: Message) => {
      try {
        await writer.write(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
      } catch (err) {
        console.error("Error writing message to client:", err);
      }
    },
    close: async () => {
      try {
        await writer.close();
      } catch (err) {
        // Ignore errors on close
      }
    },
  };

  activeClients.add(client);

  // Keep the connection open until aborted
  await new Promise<void>((resolve) => {
    requestEv.signal.addEventListener("abort", () => {
      activeClients.delete(client);
      client.close();
      resolve();
    });
  });
};

export const onPost = async (requestEv: RequestEvent) => {
  let body: any;
  try {
    body = await requestEv.parseBody();
  } catch (err) {
    requestEv.status(400);
    return requestEv.json(400, { error: "Invalid JSON payload" });
  }

  if (
    !body ||
    typeof body !== "object" ||
    typeof body.user !== "string" ||
    typeof body.text !== "string" ||
    body.user === "" ||
    body.text === ""
  ) {
    requestEv.status(400);
    return requestEv.json(400, { error: "user and text must be non-empty strings" });
  }

  try {
    const savedMessage = await insertMessage(body.user, body.text);

    // Broadcast to all active clients (asynchronously, do not block POST response)
    const clients = Array.from(activeClients);
    for (const client of clients) {
      client.send(savedMessage).catch((err) => {
        console.error("Failed to send broadcast message:", err);
      });
    }

    requestEv.status(201);
    return requestEv.json(201, savedMessage);
  } catch (err) {
    console.error("Failed to save or broadcast message:", err);
    requestEv.status(500);
    return requestEv.json(500, { error: "Internal Server Error" });
  }
};
