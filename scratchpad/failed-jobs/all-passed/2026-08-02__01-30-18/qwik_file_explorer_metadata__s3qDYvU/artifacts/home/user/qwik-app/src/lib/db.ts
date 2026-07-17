import Database from "better-sqlite3";
import { mkdirSync } from "fs";

// Ensure the uploads directory exists on startup
mkdirSync("/home/user/qwik-app/public/uploads", { recursive: true });

const dbPath = "/home/user/qwik-app/metadata.db";
export const db = new Database(dbPath);

// Initialize the files table
db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    size INTEGER NOT NULL,
    mime TEXT NOT NULL,
    tag TEXT NOT NULL
  )
`);
