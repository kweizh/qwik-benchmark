import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = '/home/user/qwik-app/wiki.db';

// Ensure the directory for the DB exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Initialize table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    user TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    content_length INTEGER NOT NULL
  )
`);

export default db;
