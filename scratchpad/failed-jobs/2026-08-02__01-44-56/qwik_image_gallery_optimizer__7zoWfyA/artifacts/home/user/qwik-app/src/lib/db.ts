import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';

// Ensure the public directories exist
mkdirSync('/home/user/qwik-app/public/gallery/original', { recursive: true });
mkdirSync('/home/user/qwik-app/public/gallery/optimized', { recursive: true });

const dbPath = '/home/user/qwik-app/gallery.db';
export const db = new Database(dbPath);

// Initialize the database table
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
