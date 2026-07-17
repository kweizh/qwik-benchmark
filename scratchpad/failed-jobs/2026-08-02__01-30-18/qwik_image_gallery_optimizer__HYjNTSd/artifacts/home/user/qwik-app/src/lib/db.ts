// @ts-ignore
import { DatabaseSync } from "node:sqlite";

const DB_PATH = "/home/user/qwik-app/gallery.db";

// Initialize the database
const db = new DatabaseSync(DB_PATH);

// Initialize table
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

export interface ImageRecord {
  id: number;
  original_name: string;
  original_path: string;
  optimized_path: string;
  width: number;
  height: number;
  uploaded_at: string;
}

export function getImages(): ImageRecord[] {
  const stmt = db.prepare("SELECT * FROM images ORDER BY uploaded_at DESC");
  return stmt.all() as ImageRecord[];
}

export function insertImage(image: Omit<ImageRecord, "id" | "uploaded_at">) {
  const stmt = db.prepare(`
    INSERT INTO images (original_name, original_path, optimized_path, width, height)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(
    image.original_name,
    image.original_path,
    image.optimized_path,
    image.width,
    image.height
  );
}
