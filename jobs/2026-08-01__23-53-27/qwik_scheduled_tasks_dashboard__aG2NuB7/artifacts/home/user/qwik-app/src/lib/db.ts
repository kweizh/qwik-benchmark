import Database from "better-sqlite3";

const DB_PATH = "/home/user/qwik-app/tasks.db";

export const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Initialize schema
db.exec(`
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
    FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
  );
`);

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
