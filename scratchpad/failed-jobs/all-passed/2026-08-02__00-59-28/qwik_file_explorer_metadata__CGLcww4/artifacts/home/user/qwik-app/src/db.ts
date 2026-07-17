import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.resolve("/home/user/qwik-app/metadata.db");

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        size INTEGER NOT NULL,
        mime TEXT NOT NULL,
        tag TEXT NOT NULL
      )
    `);
  }
  return db;
}

export interface FileRecord {
  id: number;
  name: string;
  size: number;
  mime: string;
  tag: string;
}
