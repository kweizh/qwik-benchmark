import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.resolve(process.cwd(), "tasks.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      command TEXT NOT NULL,
      interval_seconds INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'PAUSED'))
    );

    CREATE TABLE IF NOT EXISTS execution_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('SUCCESS', 'FAILED')),
      timestamp TEXT NOT NULL
    );
  `);
}

export interface Task {
  id: string;
  name: string;
  command: string;
  interval_seconds: number;
  status: "ACTIVE" | "PAUSED";
}

export interface ExecutionHistory {
  id: number;
  task_id: string;
  status: "SUCCESS" | "FAILED";
  timestamp: string;
}

export function getAllTasks(): Task[] {
  return getDb().prepare("SELECT * FROM tasks").all() as Task[];
}

export function getTaskById(id: string): Task | undefined {
  return getDb().prepare("SELECT * FROM tasks WHERE id = ?").get(id) as
    | Task
    | undefined;
}

export function createTask(task: Task): Task {
  getDb()
    .prepare(
      "INSERT INTO tasks (id, name, command, interval_seconds, status) VALUES (?, ?, ?, ?, ?)"
    )
    .run(
      task.id,
      task.name,
      task.command,
      task.interval_seconds,
      task.status
    );
  return task;
}

export function updateTaskStatus(
  id: string,
  status: "ACTIVE" | "PAUSED"
): boolean {
  const result = getDb()
    .prepare("UPDATE tasks SET status = ? WHERE id = ?")
    .run(status, id);
  return result.changes > 0;
}

export function addExecutionHistory(
  taskId: string,
  status: "SUCCESS" | "FAILED",
  timestamp: string
): void {
  getDb()
    .prepare(
      "INSERT INTO execution_history (task_id, status, timestamp) VALUES (?, ?, ?)"
    )
    .run(taskId, status, timestamp);
}

export function getExecutionHistory(taskId: string): ExecutionHistory[] {
  return getDb()
    .prepare(
      "SELECT * FROM execution_history WHERE task_id = ? ORDER BY timestamp DESC"
    )
    .all(taskId) as ExecutionHistory[];
}

export function getAllExecutionHistory(): ExecutionHistory[] {
  return getDb()
    .prepare("SELECT * FROM execution_history ORDER BY timestamp DESC")
    .all() as ExecutionHistory[];
}
