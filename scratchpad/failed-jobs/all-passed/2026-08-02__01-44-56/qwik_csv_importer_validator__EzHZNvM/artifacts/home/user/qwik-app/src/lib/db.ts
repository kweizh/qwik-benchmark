import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }
  dbInstance = await open({
    filename: '/home/user/qwik-app/database.sqlite',
    driver: sqlite3.Database
  });

  // Ensure table exists
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      age INTEGER NOT NULL
    )
  `);

  return dbInstance;
}
