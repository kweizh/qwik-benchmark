import Database from "better-sqlite3";
import path from "node:path";

export type TaskStatus = "ACTIVE" | "PAUSED";
export type ExecutionStatus = "SUCCESS" | "FAILED";

export interface Task {
  id: string;
  name: string;
  command: string;
  interval_seconds: number;
  status: TaskStatus;
}

export interface ExecutionHistoryRow {
  id: number;
  task_id: string;
  status: ExecutionStatus;
  timestamp: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __tasksDb: import("better-sqlite3").Database | undefined;
}

function createDb() {
  const dbPath = path.resolve(process.cwd(), "tasks.db");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      command TEXT NOT NULL,
      interval_seconds INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'PAUSED'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS execution_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED')),
      timestamp TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );
  `);

  return db;
}

/** Returns a process-wide singleton database connection. */
export function getDb() {
  if (!globalThis.__tasksDb) {
    globalThis.__tasksDb = createDb();
  }
  return globalThis.__tasksDb;
}

export function getAllTasks(): Task[] {
  return getDb()
    .prepare("SELECT id, name, command, interval_seconds, status FROM tasks ORDER BY name")
    .all() as Task[];
}

export function getTaskById(id: string): Task | undefined {
  return getDb()
    .prepare("SELECT id, name, command, interval_seconds, status FROM tasks WHERE id = ?")
    .get(id) as Task | undefined;
}

export function createTask(task: Task): void {
  getDb()
    .prepare(
      "INSERT INTO tasks (id, name, command, interval_seconds, status) VALUES (@id, @name, @command, @interval_seconds, @status)",
    )
    .run(task);
}

export function updateTaskStatus(id: string, status: TaskStatus): void {
  getDb().prepare("UPDATE tasks SET status = ? WHERE id = ?").run(status, id);
}

export function insertHistory(
  taskId: string,
  status: ExecutionStatus,
  timestamp: string,
): void {
  getDb()
    .prepare(
      "INSERT INTO execution_history (task_id, status, timestamp) VALUES (?, ?, ?)",
    )
    .run(taskId, status, timestamp);
}

export function getHistoryForTask(taskId: string): ExecutionHistoryRow[] {
  return getDb()
    .prepare(
      "SELECT id, task_id, status, timestamp FROM execution_history WHERE task_id = ? ORDER BY timestamp DESC",
    )
    .all(taskId) as ExecutionHistoryRow[];
}

export function getAllHistory(limit = 100): ExecutionHistoryRow[] {
  return getDb()
    .prepare(
      "SELECT id, task_id, status, timestamp FROM execution_history ORDER BY timestamp DESC LIMIT ?",
    )
    .all(limit) as ExecutionHistoryRow[];
}
