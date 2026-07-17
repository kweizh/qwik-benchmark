import { type RequestHandler } from "@builder.io/qwik-city";
import { getMessages, insertMessage, type Message } from "../../../db";

type Client = {
  id: string;
  send: (msg: Message) => void;
};

let clients: Client[] = [];

export const onGet: RequestHandler = async ({ request, send }) => {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const clientId = Math.random().toString(36).substring(2);

  const sendToThisClient = (msg: Message) => {
    try {
      writer.write(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
    } catch {
      // If write fails, cleanup
      cleanup();
    }
  };

  const cleanup = () => {
    clients = clients.filter((c) => c.id !== clientId);
    try {
      writer.close();
    } catch {
      // ignore
    }
  };

  request.signal.addEventListener("abort", cleanup);

  // Send existing messages immediately
  const existing = getMessages();
  for (const msg of existing) {
    sendToThisClient(msg);
  }

  // Register client for future broadcasts
  clients.push({
    id: clientId,
    send: sendToThisClient,
  });

  const response = new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });

  send(response);
};

export const onPost: RequestHandler = async ({ request, json, status }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    status(400);
    json(400, { error: "Invalid JSON" });
    return;
  }

  if (
    !body ||
    typeof body.user !== "string" ||
    typeof body.text !== "string" ||
    body.user.trim() === "" ||
    body.text.trim() === ""
  ) {
    status(400);
    json(400, { error: "Bad Request" });
    return;
  }

  const user = body.user.trim();
  const text = body.text.trim();
  const timestamp = new Date().toISOString();

  const savedMessage = insertMessage(user, text, timestamp);

  // Broadcast to all active clients
  for (const client of clients) {
    client.send(savedMessage);
  }

  status(201);
  json(201, savedMessage);
};
