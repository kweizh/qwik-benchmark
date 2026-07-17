import Database from "better-sqlite3";
import path from "path";

const DB_PATH = "/home/user/qwik-app/chat.db";

let db: Database.Database | null = null;

export interface Message {
  id: number;
  user: string;
  text: string;
  timestamp: string;
}

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user TEXT NOT NULL,
        text TEXT NOT NULL,
        timestamp TEXT NOT NULL
      )
    `);
  }
  return db;
}

export function getAllMessages(): Message[] {
  const database = getDb();
  return database.prepare("SELECT * FROM messages ORDER BY id ASC").all() as Message[];
}

export function insertMessage(user: string, text: string): Message {
  const database = getDb();
  const timestamp = new Date().toISOString();
  const stmt = database.prepare(
    "INSERT INTO messages (user, text, timestamp) VALUES (?, ?, ?)"
  );
  const result = stmt.run(user, text, timestamp);
  return {
    id: result.lastInsertRowid as number,
    user,
    text,
    timestamp,
  };
}
