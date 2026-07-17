import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'notes.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize the schema
db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default db;
