import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';

let dbPromise: Promise<Database> | null = null;

export async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await open({
        filename: '/home/user/qwik-app/database.sqlite',
        driver: sqlite3.Database
      });
      
      // Enable foreign keys
      await db.exec('PRAGMA foreign_keys = ON;');
      
      // Create table if it doesn't exist
      await db.exec(`
        CREATE TABLE IF NOT EXISTS Comment (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          postId TEXT NOT NULL,
          parentId INTEGER,
          text TEXT NOT NULL,
          author TEXT NOT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parentId) REFERENCES Comment(id) ON DELETE CASCADE
        );
      `);
      
      return db;
    })();
  }
  return dbPromise;
}

export function toISOString(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  if (dateStr.includes('T') && dateStr.includes('Z')) {
    return dateStr;
  }
  // SQLite CURRENT_TIMESTAMP is UTC.
  const utcDateStr = dateStr.endsWith(' UTC') || dateStr.endsWith('Z') ? dateStr : dateStr + ' UTC';
  return new Date(utcDateStr).toISOString();
}
