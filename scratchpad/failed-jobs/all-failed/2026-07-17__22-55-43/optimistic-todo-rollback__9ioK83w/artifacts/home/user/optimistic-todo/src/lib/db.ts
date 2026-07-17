import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

// This module touches the filesystem and native bindings (better-sqlite3) and
// must only ever be imported from server-only code paths, i.e. from within
// routeLoader$ / routeAction$ callbacks. Qwik's optimizer extracts those
// callbacks into server-only QRL segments, so this module never ends up in
// the client bundle.

export interface TodoRow {
  id: string;
  title: string;
  completed: number;
}

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

const DB_PATH = join(process.cwd(), "data", "todos.sqlite");

let db: Database.Database | undefined;

function getDb(): Database.Database {
  if (!db) {
    const dir = dirname(DB_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0
      )
    `);
  }
  return db;
}

function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    completed: !!row.completed,
  };
}

export function listTodos(): Todo[] {
  const rows = getDb()
    .prepare("SELECT id, title, completed FROM todos ORDER BY rowid ASC")
    .all() as TodoRow[];
  return rows.map(rowToTodo);
}

export function insertTodo(id: string, title: string): Todo {
  getDb()
    .prepare(
      "INSERT INTO todos (id, title, completed) VALUES (?, ?, 0)",
    )
    .run(id, title);
  return { id, title, completed: false };
}

export function setTodoCompleted(id: string, completed: boolean): Todo | undefined {
  getDb()
    .prepare("UPDATE todos SET completed = ? WHERE id = ?")
    .run(completed ? 1 : 0, id);
  const row = getDb()
    .prepare("SELECT id, title, completed FROM todos WHERE id = ?")
    .get(id) as TodoRow | undefined;
  return row ? rowToTodo(row) : undefined;
}

export function deleteTodo(id: string): void {
  getDb().prepare("DELETE FROM todos WHERE id = ?").run(id);
}

/** Simulated network/behavior helpers shared by all mutating actions. */
export function shouldSimulateFailure(title: string): boolean {
  return title.startsWith("FAIL");
}

export function shouldSimulateSlow(title: string): boolean {
  return title.startsWith("SLOW");
}

export async function simulateLatency(title: string): Promise<void> {
  if (shouldSimulateSlow(title)) {
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }
}
