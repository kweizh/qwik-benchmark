import sqlite3 from "sqlite3";

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

export type NewImageRecord = Omit<ImageRecord, "id" | "uploaded_at">;

let dbInstance: sqlite3.Database | null = null;

export function getDb(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      return resolve(dbInstance);
    }
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        return reject(err);
      }
      dbInstance = db;
      db.run(
        `CREATE TABLE IF NOT EXISTS images (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          original_name TEXT NOT NULL,
          original_path TEXT NOT NULL,
          optimized_path TEXT NOT NULL,
          width INTEGER NOT NULL,
          height INTEGER NOT NULL,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        (err) => {
          if (err) {
            return reject(err);
          }
          resolve(db);
        }
      );
    });
  });
}

export async function insertImage(image: NewImageRecord): Promise<number> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO images (original_name, original_path, optimized_path, width, height)
       VALUES (?, ?, ?, ?, ?)`,
      [
        image.original_name,
        image.original_path,
        image.optimized_path,
        image.width,
        image.height,
      ],
      function (this: sqlite3.RunResult, err: Error | null) {
        if (err) {
          return reject(err);
        }
        resolve(this.lastID);
      }
    );
  });
}

export async function getAllImages(): Promise<ImageRecord[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, original_name, original_path, optimized_path, width, height, uploaded_at 
       FROM images 
       ORDER BY uploaded_at DESC`,
      [],
      (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows as ImageRecord[]);
      }
    );
  });
}
