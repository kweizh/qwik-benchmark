/**
 * Server-only SQLite data access for the todos app.
 *
 * The `.server.ts` extension guarantees Qwik/Vite never include this module
 * (or `better-sqlite3`) in the client bundle. It may only be imported from
 * server execution contexts such as `routeLoader$` / `routeAction$`.
 */
import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export type Todo = {
  id: string;
  title: string;
  completed: boolean;
};

type Row = {
  id: string;
  title: string;
  completed: number;
};

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) {
    return db;
  }
  const dataDir = join(process.cwd(), "data");
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  const database = new Database(join(dataDir, "todos.sqlite"));
  database.pragma("journal_mode = WAL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0
    );
  `);
  db = database;
  return database;
}

function toTodo(row: Row): Todo {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed === 1,
  };
}

export function getAllTodos(): Todo[] {
  const rows = getDb()
    .prepare("SELECT id, title, completed FROM todos ORDER BY id ASC")
    .all() as Row[];
  return rows.map(toTodo);
}

export function getTodoById(id: string): Todo | null {
  const row = getDb()
    .prepare("SELECT id, title, completed FROM todos WHERE id = ?")
    .get(id) as Row | undefined;
  return row ? toTodo(row) : null;
}

export function insertTodo(id: string, title: string): Todo {
  getDb()
    .prepare(
      "INSERT INTO todos (id, title, completed) VALUES (?, ?, 0)",
    )
    .run(id, title);
  return { id, title, completed: false };
}

export function setCompleted(id: string, completed: boolean): Todo | null {
  const existing = getTodoById(id);
  if (!existing) {
    return null;
  }
  getDb()
    .prepare("UPDATE todos SET completed = ? WHERE id = ?")
    .run(completed ? 1 : 0, id);
  return { ...existing, completed };
}

export function deleteTodo(id: string): boolean {
  const result = getDb().prepare("DELETE FROM todos WHERE id = ?").run(id);
  return result.changes > 0;
}