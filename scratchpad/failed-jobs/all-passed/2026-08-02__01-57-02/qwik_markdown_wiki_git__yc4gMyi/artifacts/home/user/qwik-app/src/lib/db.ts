import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = '/home/user/qwik-app/wiki.db';

// Ensure the directory for the db exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    user TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    content_length INTEGER NOT NULL
  )
`);
