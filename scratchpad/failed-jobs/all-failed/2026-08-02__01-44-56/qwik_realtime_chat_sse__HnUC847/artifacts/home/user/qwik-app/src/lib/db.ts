import { DatabaseSync } from 'node:sqlite';

const DB_PATH = '/home/user/qwik-app/chat.db';

let db: DatabaseSync;

try {
  db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT NOT NULL,
      text TEXT NOT NULL,
      timestamp TEXT NOT NULL
    )
  `);
} catch (error) {
  console.error('Failed to initialize database:', error);
  throw error;
}

export interface Message {
  id: number;
  user: string;
  text: string;
  timestamp: string;
}

export function getAllMessages(): Message[] {
  try {
    const stmt = db.prepare('SELECT id, user, text, timestamp FROM messages ORDER BY id ASC');
    return stmt.all() as any[];
  } catch (error) {
    console.error('Failed to get messages:', error);
    return [];
  }
}

export function insertMessage(user: string, text: string): Message {
  const timestamp = new Date().toISOString();
  const stmt = db.prepare('INSERT INTO messages (user, text, timestamp) VALUES (?, ?, ?)');
  const result = stmt.run(user, text, timestamp);
  return {
    id: result.lastInsertRowid as number,
    user,
    text,
    timestamp,
  };
}
