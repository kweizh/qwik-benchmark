import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

// This module must only ever be imported from server$() functions or other
// server-only code paths. It talks to a local SQLite file inside the project.
const DB_DIR = join(process.cwd(), ".data");
const DB_PATH = join(DB_DIR, "cart.sqlite");

if (!existsSync(dirname(DB_PATH))) {
  mkdirSync(dirname(DB_PATH), { recursive: true });
}

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS cart_items (
      session_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      PRIMARY KEY (session_id, product_id)
    );
  `);

  dbInstance = db;
  return db;
}
