import Database from "better-sqlite3";

const dbPath = "/home/user/qwik-app/chat.db";
const db = new Database(dbPath);

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp TEXT NOT NULL
  )
`);

export interface Message {
  id: number;
  user: string;
  text: string;
  timestamp: string;
}

export function getMessages(): Message[] {
  return db
    .prepare("SELECT id, user, text, timestamp FROM messages ORDER BY id ASC")
    .all() as Message[];
}

export function insertMessage(user: string, text: string, timestamp: string): Message {
  const info = db
    .prepare("INSERT INTO messages (user, text, timestamp) VALUES (?, ?, ?)")
    .run(user, text, timestamp);
  return {
    id: Number(info.lastInsertRowid),
    user,
    text,
    timestamp,
  };
}
