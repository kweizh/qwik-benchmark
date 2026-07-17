/**
 * Server-only SQLite database for the Markdown Notes app.
 *
 * This module uses `better-sqlite3`, which is a native binding and must
 * NEVER be imported into a client bundle. It is only ever referenced
 * from inside Qwik City's server primitives (`routeLoader$` /
 * `routeAction$`), so the optimizer tree-shakes it out of the client.
 */
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export interface NoteRow {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface NewNote {
  title: string;
  content: string;
}

let dbInstance: Database.Database | null = null;

function getDbPath(): string {
  // Resolve relative to the project root so it works both in `vite dev`
  // and in any future production build.
  return resolve(process.cwd(), "data", "notes.db");
}

function initDb(): Database.Database {
  const dbPath = getDbPath();
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  // Reasonable pragmas for a small write-light app.
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT    NOT NULL,
      content    TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}

function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = initDb();
  }
  return dbInstance;
}

export function listNotes(): NoteRow[] {
  const db = getDb();
  return db
    .prepare<[], NoteRow>(
      "SELECT id, title, content, created_at, updated_at FROM notes ORDER BY id DESC",
    )
    .all();
}

export function getNote(id: number): NoteRow | undefined {
  const db = getDb();
  return db
    .prepare<[number], NoteRow>(
      "SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ?",
    )
    .get(id);
}

export function createNote(note: NewNote): NoteRow {
  const db = getDb();
  const info = db
    .prepare("INSERT INTO notes (title, content) VALUES (?, ?)")
    .run(note.title, note.content);
  const row = db
    .prepare<[number | bigint], NoteRow>(
      "SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ?",
    )
    .get(info.lastInsertRowid);
  if (!row) {
    throw new Error("Failed to read back inserted note");
  }
  return row;
}

export function updateNote(id: number, note: NewNote): NoteRow | undefined {
  const db = getDb();
  const info = db
    .prepare(
      "UPDATE notes SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .run(note.title, note.content, id);
  if (info.changes === 0) {
    return undefined;
  }
  return getNote(id);
}

export function deleteNote(id: number): boolean {
  const db = getDb();
  const info = db.prepare("DELETE FROM notes WHERE id = ?").run(id);
  return info.changes > 0;
}