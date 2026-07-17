import fs from "node:fs";
import Database from "better-sqlite3";

export const DB_PATH = "/home/user/qwik-app/metadata.db";
export const UPLOADS_DIR = "/home/user/qwik-app/public/uploads";

// Make sure the uploads directory exists on module load.
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export interface FileRecord {
  id: number;
  name: string;
  size: number;
  mime: string;
  tag: string;
}

let db: Database.Database | undefined;

/**
 * Returns a singleton connection to the SQLite metadata database,
 * creating the `files` table if it does not already exist.
 */
export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        size INTEGER NOT NULL,
        mime TEXT NOT NULL,
        tag TEXT NOT NULL
      )
    `);
  }
  return db;
}

export function listFiles(): FileRecord[] {
  return getDb()
    .prepare("SELECT id, name, size, mime, tag FROM files ORDER BY id ASC")
    .all() as FileRecord[];
}

export function getFileById(id: number): FileRecord | undefined {
  return getDb()
    .prepare("SELECT id, name, size, mime, tag FROM files WHERE id = ?")
    .get(id) as FileRecord | undefined;
}

export function insertFile(
  name: string,
  size: number,
  mime: string,
  tag: string,
): FileRecord {
  const info = getDb()
    .prepare("INSERT INTO files (name, size, mime, tag) VALUES (?, ?, ?, ?)")
    .run(name, size, mime, tag);
  return { id: Number(info.lastInsertRowid), name, size, mime, tag };
}

export function deleteFileRecord(id: number): boolean {
  const info = getDb().prepare("DELETE FROM files WHERE id = ?").run(id);
  return info.changes > 0;
}

/**
 * Disk file names are prefixed with the database id to guarantee
 * uniqueness even if two uploads share the same original file name.
 */
export function diskFileName(id: number, name: string): string {
  return `${id}_${name}`;
}
