import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const dbDir = join(process.cwd(), 'data');
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const dbPath = join(dbDir, 'todos.sqlite');
const db = new Database(dbPath);

// Initialize table
db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0
  )
`);

export interface Todo {
  id: string;
  title: string;
  completed: number; // 0 or 1
}

export function getTodos(): Todo[] {
  return db.prepare('SELECT * FROM todos').all() as Todo[];
}

export function getTodoById(id: string): Todo | undefined {
  return db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as Todo | undefined;
}

export function addTodo(id: string, title: string, completed: number): void {
  db.prepare('INSERT INTO todos (id, title, completed) VALUES (?, ?, ?)').run(id, title, completed);
}

export function updateTodo(id: string, completed: number): void {
  db.prepare('UPDATE todos SET completed = ? WHERE id = ?').run(completed, id);
}

export function deleteTodo(id: string): void {
  db.prepare('DELETE FROM todos WHERE id = ?').run(id);
}
