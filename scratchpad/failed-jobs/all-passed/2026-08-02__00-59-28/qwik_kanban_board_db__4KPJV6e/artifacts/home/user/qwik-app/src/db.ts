import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "kanban.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      column TEXT NOT NULL CHECK(column IN ('TODO', 'IN_PROGRESS', 'DONE')),
      position INTEGER NOT NULL
    )
  `);
}

export interface Task {
  id: number;
  title: string;
  column: "TODO" | "IN_PROGRESS" | "DONE";
  position: number;
}

export const VALID_COLUMNS = ["TODO", "IN_PROGRESS", "DONE"] as const;
