import type { RequestHandler } from '@builder.io/qwik-city';
import { getDb, getClients, broadcastMessage } from '../../../chat-db';

export const onGet: RequestHandler = async (requestEvent) => {
  requestEvent.status(200);
  requestEvent.headers.set('Content-Type', 'text/event-stream');
  requestEvent.headers.set('Cache-Control', 'no-cache');
  requestEvent.headers.set('Connection', 'keep-alive');

  const writable = requestEvent.getWritableStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const clientId = Math.random().toString(36).substring(2);

  const client = {
    id: clientId,
    write: (data: string) => {
      writer.write(encoder.encode(data));
    },
    close: () => {
      try {
        writer.close();
      } catch {
        // ignore
      }
    }
  };

  getClients().add(client);

  // Fetch all existing messages from the database and stream them immediately
  const db = getDb();
  const select = db.prepare('SELECT id, user, text, timestamp FROM messages ORDER BY id ASC');
  const messages = select.all() as Array<{ id: number; user: string; text: string; timestamp: string }>;

  for (const msg of messages) {
    client.write(`data: ${JSON.stringify(msg)}\n\n`);
  }

  // Return a promise that resolves when the request is aborted
  return new Promise<void>((resolve) => {
    const onAbort = () => {
      getClients().delete(client);
      client.close();
      requestEvent.signal.removeEventListener('abort', onAbort);
      resolve();
    };

    if (requestEvent.signal.aborted) {
      onAbort();
    } else {
      requestEvent.signal.addEventListener('abort', onAbort);
    }
  });
};

export const onPost: RequestHandler = async (requestEvent) => {
  const body = await requestEvent.parseBody() as any;
  if (!body || typeof body !== 'object') {
    requestEvent.json(400, { error: 'Invalid body' });
    return;
  }

  const { user, text } = body;
  if (typeof user !== 'string' || typeof text !== 'string' || user === '' || text === '') {
    requestEvent.json(400, { error: 'User and text must be non-empty strings' });
    return;
  }

  const db = getDb();
  const timestamp = new Date().toISOString();

  const insert = db.prepare('INSERT INTO messages (user, text, timestamp) VALUES (?, ?, ?)');
  const result = insert.run(user, text, timestamp);
  const id = Number(result.lastInsertRowid);

  const savedMessage = { id, user, text, timestamp };

  // Broadcast to all active clients
  broadcastMessage(savedMessage);

  // Return 201 status with the JSON payload
  requestEvent.json(201, savedMessage);
};
