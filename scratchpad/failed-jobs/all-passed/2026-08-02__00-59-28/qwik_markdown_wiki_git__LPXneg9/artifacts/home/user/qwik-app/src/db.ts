import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = "/home/user/qwik-app/wiki.db";

function getDb(): Database.Database {
  // Ensure the directory for the database exists
  const dbDir = dirname(DB_PATH);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent access
  db.pragma("journal_mode = WAL");

  // Create the revisions table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS revisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL,
      user TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      content_length INTEGER NOT NULL
    )
  `);

  // Create an index on slug + timestamp for faster history queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_revisions_slug_timestamp
    ON revisions(slug, timestamp DESC)
  `);

  return db;
}

export interface Revision {
  id: number;
  slug: string;
  user: string;
  timestamp: number;
  content_length: number;
}

export function insertRevision(
  slug: string,
  user: string,
  content: string,
): Revision {
  const db = getDb();
  const timestamp = Date.now();
  const content_length = content.length;

  const stmt = db.prepare(`
    INSERT INTO revisions (slug, user, timestamp, content_length)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(slug, user, timestamp, content_length);

  db.close();

  return {
    id: result.lastInsertRowid as number,
    slug,
    user,
    timestamp,
    content_length,
  };
}

export function getRevisions(slug: string): Revision[] {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT id, slug, user, timestamp, content_length
    FROM revisions
    WHERE slug = ?
    ORDER BY timestamp DESC
  `);

  const rows = stmt.all(slug) as Revision[];

  db.close();

  return rows;
}
