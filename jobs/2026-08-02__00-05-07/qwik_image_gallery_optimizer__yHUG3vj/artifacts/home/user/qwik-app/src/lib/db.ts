import { DatabaseSync } from "node:sqlite";

// Absolute path to the SQLite database file, per project spec.
const DB_PATH = "/home/user/qwik-app/gallery.db";

export interface ImageRecord {
  id: number;
  original_name: string;
  original_path: string;
  optimized_path: string;
  width: number;
  height: number;
  uploaded_at: string;
}

let db: DatabaseSync | undefined;

/**
 * Returns a singleton SQLite database connection, creating the `images`
 * table if it doesn't already exist.
 */
export function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_name TEXT NOT NULL,
        original_path TEXT NOT NULL,
        optimized_path TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  return db;
}

export function insertImage(record: {
  original_name: string;
  original_path: string;
  optimized_path: string;
  width: number;
  height: number;
}): number {
  const database = getDb();
  const stmt = database.prepare(
    `INSERT INTO images (original_name, original_path, optimized_path, width, height)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const result = stmt.run(
    record.original_name,
    record.original_path,
    record.optimized_path,
    record.width,
    record.height,
  );
  return Number(result.lastInsertRowid);
}

export function listImages(): ImageRecord[] {
  const database = getDb();
  const stmt = database.prepare(
    `SELECT id, original_name, original_path, optimized_path, width, height, uploaded_at
     FROM images
     ORDER BY uploaded_at DESC`,
  );
  return stmt.all() as unknown as ImageRecord[];
}
