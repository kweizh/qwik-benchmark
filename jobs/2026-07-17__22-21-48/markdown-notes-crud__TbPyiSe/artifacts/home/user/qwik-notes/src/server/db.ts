/**
 * Server-only SQLite database access for notes.
 *
 * This module MUST only ever be imported from inside Qwik City server
 * boundaries (routeLoader$, routeAction$, server$). It depends on the native
 * `better-sqlite3` addon which cannot run in the browser, so it must never
 * leak into the client bundle.
 */
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type Note = {
  id: number;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
};

export type NoteInput = {
  title: string;
  content: string;
};

const DB_PATH = resolve(process.cwd(), "data", "notes.db");

// Reuse a single connection across HMR reloads in dev to avoid locking issues.
const globalForDb = globalThis as unknown as {
  __notesDb?: Database.Database;
};

function getDb(): Database.Database {
  if (globalForDb.__notesDb) {
    return globalForDb.__notesDb;
  }

  mkdirSync(dirname(DB_PATH), { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT    NOT NULL,
      content    TEXT    NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  globalForDb.__notesDb = db;
  return db;
}

export function listNotes(): Note[] {
  const db = getDb();
  return db
    .prepare("SELECT id, title, content, created_at, updated_at FROM notes ORDER BY id DESC")
    .all() as Note[];
}

export function getNote(id: number): Note | undefined {
  const db = getDb();
  return db
    .prepare("SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ?")
    .get(id) as Note | undefined;
}

export function createNote(input: NoteInput): Note {
  const db = getDb();
  const now = Date.now();
  const info = db
    .prepare("INSERT INTO notes (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)")
    .run(input.title, input.content, now, now);
  return getNote(Number(info.lastInsertRowid)) as Note;
}

export function updateNote(id: number, input: NoteInput): Note | undefined {
  const existing = getNote(id);
  if (!existing) {
    return undefined;
  }
  const db = getDb();
  const now = Date.now();
  db.prepare(
    "UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ?",
  ).run(input.title, input.content, now, id);
  return getNote(id);
}

export function deleteNote(id: number): boolean {
  const db = getDb();
  const info = db.prepare("DELETE FROM notes WHERE id = ?").run(id);
  return info.changes > 0;
}