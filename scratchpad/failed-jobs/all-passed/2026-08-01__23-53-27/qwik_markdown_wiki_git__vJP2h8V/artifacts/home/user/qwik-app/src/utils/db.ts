import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dbPath = "/home/user/qwik-app/wiki.db";

// Ensure the directory for the database exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);

// Initialize the database table
db.exec(`
  CREATE TABLE IF NOT EXISTS revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    user TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    content_length INTEGER NOT NULL
  )
`);
