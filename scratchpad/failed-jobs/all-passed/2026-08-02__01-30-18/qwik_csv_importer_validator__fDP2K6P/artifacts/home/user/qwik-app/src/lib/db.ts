import Database from 'better-sqlite3';

const dbPath = '/home/user/qwik-app/database.sqlite';

let db: Database.Database | null = null;

export function getDB(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    // Ensure table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        age INTEGER NOT NULL
      )
    `);
  }
  return db;
}
