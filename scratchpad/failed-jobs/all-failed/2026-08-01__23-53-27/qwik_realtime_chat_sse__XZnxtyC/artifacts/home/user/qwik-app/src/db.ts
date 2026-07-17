import { open, Database } from "sqlite";
import sqlite3 from "sqlite3";

let dbInstance: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await open({
    filename: "/home/user/qwik-app/chat.db",
    driver: sqlite3.Database,
  });

  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT NOT NULL,
      text TEXT NOT NULL,
      timestamp TEXT NOT NULL
    )
  `);

  return dbInstance;
}

export interface Message {
  id: number;
  user: string;
  text: string;
  timestamp: string;
}

export async function getAllMessages(): Promise<Message[]> {
  const db = await getDb();
  return db.all<Message[]>("SELECT id, user, text, timestamp FROM messages ORDER BY id ASC");
}

export async function insertMessage(user: string, text: string): Promise<Message> {
  const db = await getDb();
  const timestamp = new Date().toISOString();
  const result = await db.run(
    "INSERT INTO messages (user, text, timestamp) VALUES (?, ?, ?)",
    [user, text, timestamp]
  );
  
  const id = result.lastID;
  if (id === undefined) {
    throw new Error("Failed to insert message: lastID is undefined");
  }

  return {
    id,
    user,
    text,
    timestamp,
  };
}
