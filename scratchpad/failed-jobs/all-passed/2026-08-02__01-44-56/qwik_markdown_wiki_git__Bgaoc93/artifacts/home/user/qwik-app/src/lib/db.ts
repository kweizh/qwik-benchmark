import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const DB_PATH = '/home/user/qwik-app/wiki.db';

// Ensure the parent directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    // Initialize schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS revisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL,
        user TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        content_length INTEGER NOT NULL
      )
    `);
  }
  return db;
}

export interface Revision {
  id: number;
  slug: string;
  user: string;
  timestamp: number;
  content_length: number;
}

export function insertRevision(slug: string, user: string, contentLength: number): void {
  const database = getDb();
  const stmt = database.prepare('INSERT INTO revisions (slug, user, timestamp, content_length) VALUES (?, ?, ?, ?)');
  stmt.run(slug, user, Date.now(), contentLength);
}

export function getRevisions(slug: string): Revision[] {
  const database = getDb();
  const stmt = database.prepare('SELECT id, slug, user, timestamp, content_length FROM revisions WHERE slug = ? ORDER BY timestamp DESC');
  return stmt.all(slug) as unknown as Revision[];
}
