import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Path to the local SQLite database used to store wiki revision history.
 */
export const WIKI_DB_PATH = "/home/user/qwik-app/wiki.db";

export interface Revision {
  id: number;
  slug: string;
  user: string;
  timestamp: number;
  content_length: number;
}

let dbInstance: DatabaseSync | undefined;

function getDb(): DatabaseSync {
  if (!dbInstance) {
    const dir = dirname(WIKI_DB_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    dbInstance = new DatabaseSync(WIKI_DB_PATH);
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS revisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL,
        user TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        content_length INTEGER NOT NULL
      )
    `);
  }
  return dbInstance;
}

export function insertRevision(
  slug: string,
  user: string,
  contentLength: number,
): Revision {
  const db = getDb();
  const timestamp = Date.now();

  const stmt = db.prepare(
    "INSERT INTO revisions (slug, user, timestamp, content_length) VALUES (?, ?, ?, ?)",
  );
  const result = stmt.run(slug, user, timestamp, contentLength);

  return {
    id: Number(result.lastInsertRowid),
    slug,
    user,
    timestamp,
    content_length: contentLength,
  };
}

export function getRevisions(slug: string): Revision[] {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT id, slug, user, timestamp, content_length FROM revisions WHERE slug = ? ORDER BY timestamp DESC",
  );
  const rows = stmt.all(slug) as unknown as Revision[];
  return rows;
}
