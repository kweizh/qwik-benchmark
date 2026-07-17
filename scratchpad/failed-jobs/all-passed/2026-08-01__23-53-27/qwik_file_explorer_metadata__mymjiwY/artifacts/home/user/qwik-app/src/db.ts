import Database from 'better-sqlite3';

const dbPath = '/home/user/qwik-app/metadata.db';
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    size INTEGER NOT NULL,
    mime TEXT NOT NULL,
    tag TEXT NOT NULL
  )
`);

export default db;
