import Database from 'better-sqlite3';

const DB_PATH = '/home/user/qwik-app/tasks.db';

export interface Task {
  id: string;
  name: string;
  command: string;
  interval_seconds: number;
  status: 'ACTIVE' | 'PAUSED';
}

export interface ExecutionHistory {
  id?: number;
  task_id: string;
  status: 'SUCCESS' | 'FAILED';
  timestamp: string;
}

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);
    // Enable foreign keys
    dbInstance.pragma('foreign_keys = ON');

    // Create tables
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        command TEXT NOT NULL,
        interval_seconds INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'PAUSED'))
      );

      CREATE TABLE IF NOT EXISTS execution_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED')),
        timestamp TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );
    `);
  }
  return dbInstance;
}

export function getAllTasks(): Task[] {
  const db = getDb();
  return db.prepare('SELECT * FROM tasks').all() as Task[];
}

export function getTaskById(id: string): Task | null {
  const db = getDb();
  return (db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task) || null;
}

export function createTask(task: Task): void {
  const db = getDb();
  db.prepare(
    'INSERT INTO tasks (id, name, command, interval_seconds, status) VALUES (?, ?, ?, ?, ?)'
  ).run(task.id, task.name, task.command, task.interval_seconds, task.status);
}

export function updateTaskStatus(id: string, status: 'ACTIVE' | 'PAUSED'): void {
  const db = getDb();
  db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, id);
}

export function getExecutionHistory(taskId: string): ExecutionHistory[] {
  const db = getDb();
  return db
    .prepare('SELECT * FROM execution_history WHERE task_id = ? ORDER BY timestamp DESC')
    .all(taskId) as ExecutionHistory[];
}

export function getAllExecutionHistory(): ExecutionHistory[] {
  const db = getDb();
  return db
    .prepare('SELECT * FROM execution_history ORDER BY timestamp DESC')
    .all() as ExecutionHistory[];
}

export function addExecutionHistory(history: ExecutionHistory): void {
  const db = getDb();
  db.prepare(
    'INSERT INTO execution_history (task_id, status, timestamp) VALUES (?, ?, ?)'
  ).run(history.task_id, history.status, history.timestamp);
}
