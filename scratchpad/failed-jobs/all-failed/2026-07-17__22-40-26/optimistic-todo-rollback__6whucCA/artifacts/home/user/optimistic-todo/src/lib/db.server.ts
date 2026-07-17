/**
 * Server-only SQLite access module.
 *
 * The `.server.ts` suffix guarantees Qwik City's optimizer tree-shakes this
 * module out of the client bundle - `better-sqlite3` is a native Node addon
 * and must never run in the browser.
 */
import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export interface TodoRow {
  id: string;
  title: string;
  completed: number; // 0 = active, 1 = completed
}

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

const DB_PATH = resolve(process.cwd(), "data", "todos.sqlite");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;
  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0
    );
  `);
  _db = db;
  return db;
}

function rowToTodo(row: TodoRow): Todo {
  return { id: row.id, title: row.title, completed: row.completed === 1 };
}

export function listTodos(): Todo[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, title, completed FROM todos ORDER BY rowid ASC",
    )
    .all() as TodoRow[];
  return rows.map(rowToTodo);
}

export function insertTodo(todo: Todo): Todo {
  const db = getDb();
  db.prepare(
    "INSERT INTO todos (id, title, completed) VALUES (?, ?, ?)",
  ).run(todo.id, todo.title, todo.completed ? 1 : 0);
  return todo;
}

export function updateTodo(
  id: string,
  patch: Partial<Pick<Todo, "title" | "completed">>,
): Todo | null {
  const db = getDb();
  const existing = db
    .prepare("SELECT id, title, completed FROM todos WHERE id = ?")
    .get(id) as TodoRow | undefined;
  if (!existing) return null;
  const next: Todo = {
    id: existing.id,
    title: patch.title ?? existing.title,
    completed: patch.completed === undefined ? existing.completed === 1 : patch.completed,
  };
  db.prepare(
    "UPDATE todos SET title = ?, completed = ? WHERE id = ?",
  ).run(next.title, next.completed ? 1 : 0, next.id);
  return next;
}

export function deleteTodo(id: string): boolean {
  const db = getDb();
  const info = db.prepare("DELETE FROM todos WHERE id = ?").run(id);
  return info.changes > 0;
}