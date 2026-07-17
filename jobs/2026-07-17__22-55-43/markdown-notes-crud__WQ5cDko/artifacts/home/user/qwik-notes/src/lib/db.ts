import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

// This module must only ever be imported from server-only boundaries
// (routeLoader$ / routeAction$) so that the native better-sqlite3
// binding never leaks into the client bundle.

export interface NoteRow {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const DB_PATH = join(process.cwd(), "data", "notes.db");

let db: Database.Database | undefined;

function getDb(): Database.Database {
  if (db) return db;

  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}

export function listNotes(): NoteRow[] {
  return getDb()
    .prepare(
      "SELECT id, title, content, created_at, updated_at FROM notes ORDER BY updated_at DESC, id DESC",
    )
    .all() as NoteRow[];
}

export function getNote(id: number): NoteRow | undefined {
  return getDb()
    .prepare(
      "SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ?",
    )
    .get(id) as NoteRow | undefined;
}

export function createNote(title: string, content: string): NoteRow {
  const result = getDb()
    .prepare(
      "INSERT INTO notes (title, content, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))",
    )
    .run(title, content);
  return getNote(Number(result.lastInsertRowid))!;
}

export function updateNote(
  id: number,
  title: string,
  content: string,
): NoteRow | undefined {
  getDb()
    .prepare(
      "UPDATE notes SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .run(title, content, id);
  return getNote(id);
}

export function deleteNote(id: number): boolean {
  const result = getDb().prepare("DELETE FROM notes WHERE id = ?").run(id);
  return result.changes > 0;
}
