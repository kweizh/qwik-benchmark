import { DatabaseSync } from 'node:sqlite';

export interface ChatClient {
  id: string;
  write: (data: string) => void;
  close: () => void;
}

declare global {
  var _chatDb: DatabaseSync | undefined;
  var _chatClients: Set<ChatClient> | undefined;
}

export function getDb(): DatabaseSync {
  if (!globalThis._chatDb) {
    const db = new DatabaseSync('/home/user/qwik-app/chat.db');
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user TEXT NOT NULL,
        text TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );
    `);
    globalThis._chatDb = db;
  }
  return globalThis._chatDb;
}

export function getClients(): Set<ChatClient> {
  if (!globalThis._chatClients) {
    globalThis._chatClients = new Set<ChatClient>();
  }
  return globalThis._chatClients;
}

export function broadcastMessage(message: { id: number; user: string; text: string; timestamp: string }) {
  const clients = getClients();
  const payload = `data: ${JSON.stringify(message)}\n\n`;
  for (const client of clients) {
    try {
      client.write(payload);
    } catch (err) {
      console.error('Error writing to client:', err);
    }
  }
}
