import { DatabaseSync } from "node:sqlite";

export interface ChatMessage {
  id: number;
  user: string;
  text: string;
  timestamp: string;
}

const DB_PATH = "/home/user/qwik-app/chat.db";

declare global {
  // eslint-disable-next-line no-var
  var __chatDb: DatabaseSync | undefined;
  // eslint-disable-next-line no-var
  var __chatSubscribers: Set<(message: ChatMessage) => void> | undefined;
}

function createDb(): DatabaseSync {
  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT NOT NULL,
      text TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );
  `);
  return db;
}

/** Returns a singleton SQLite database connection, creating the table if needed. */
export function getDb(): DatabaseSync {
  if (!globalThis.__chatDb) {
    globalThis.__chatDb = createDb();
  }
  return globalThis.__chatDb;
}

/** Returns the process-wide set of active SSE subscriber callbacks. */
function getSubscribers(): Set<(message: ChatMessage) => void> {
  if (!globalThis.__chatSubscribers) {
    globalThis.__chatSubscribers = new Set();
  }
  return globalThis.__chatSubscribers;
}

export function getAllMessages(): ChatMessage[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT id, user, text, timestamp FROM messages ORDER BY id ASC")
    .all();
  return rows as unknown as ChatMessage[];
}

export function insertMessage(user: string, text: string): ChatMessage {
  const db = getDb();
  const timestamp = new Date().toISOString();
  const result = db
    .prepare("INSERT INTO messages (user, text, timestamp) VALUES (?, ?, ?)")
    .run(user, text, timestamp);
  const message: ChatMessage = {
    id: Number(result.lastInsertRowid),
    user,
    text,
    timestamp,
  };
  return message;
}

/** Subscribes to newly created chat messages. Returns an unsubscribe function. */
export function subscribe(callback: (message: ChatMessage) => void): () => void {
  const subscribers = getSubscribers();
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

/** Broadcasts a message to all active SSE subscribers. */
export function broadcast(message: ChatMessage): void {
  const subscribers = getSubscribers();
  for (const callback of subscribers) {
    try {
      callback(message);
    } catch {
      // ignore broken subscriber
    }
  }
}
