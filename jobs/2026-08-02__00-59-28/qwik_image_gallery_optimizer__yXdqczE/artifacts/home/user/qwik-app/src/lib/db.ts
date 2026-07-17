import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.resolve("/home/user/qwik-app/gallery.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initializeDb(db);
  }
  return db;
}

function initializeDb(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_name TEXT NOT NULL,
      original_path TEXT NOT NULL,
      optimized_path TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export interface ImageRecord {
  id: number;
  original_name: string;
  original_path: string;
  optimized_path: string;
  width: number;
  height: number;
  uploaded_at: string;
}
