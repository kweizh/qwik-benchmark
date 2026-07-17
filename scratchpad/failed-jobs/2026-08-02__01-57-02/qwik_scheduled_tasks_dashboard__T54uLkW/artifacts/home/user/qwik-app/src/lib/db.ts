import Database from "better-sqlite3";
import { exec } from "child_process";

interface Task {
  id: string;
  name: string;
  command: string;
  interval_seconds: number;
  status: "ACTIVE" | "PAUSED";
}

interface RunnerState {
  db: any;
  timers: Map<string, NodeJS.Timeout>;
  initialized: boolean;
}

const globalState = globalThis as any;
if (!globalState.__runner_state__) {
  globalState.__runner_state__ = {
    db: null,
    timers: new Map<string, NodeJS.Timeout>(),
    initialized: false,
  };
}

const state: RunnerState = globalState.__runner_state__;

if (!state.db) {
  const dbPath = "/home/user/qwik-app/tasks.db";
  state.db = new Database(dbPath);
  state.db.pragma("journal_mode = WAL");
}

export const db = state.db;
export const timers = state.timers;

export function executeTask(task: { id: string; command: string }) {
  exec(task.command, (error) => {
    const status = !error ? "SUCCESS" : "FAILED";
    const timestamp = new Date().toISOString();

    try {
      db.prepare(
        "INSERT INTO execution_history (task_id, status, timestamp) VALUES (?, ?, ?)"
      ).run(task.id, status, timestamp);
    } catch (err) {
      console.error(`Failed to log execution for task ${task.id}:`, err);
    }
  });
}

export function scheduleTask(task: { id: string; command: string; interval_seconds: number }) {
  if (timers.has(task.id)) {
    clearInterval(timers.get(task.id)!);
  }

  const intervalMs = task.interval_seconds * 1000;
  const timer = setInterval(() => {
    executeTask(task);
  }, intervalMs);

  timers.set(task.id, timer);
}

export function pauseTask(id: string) {
  const timer = timers.get(id);
  if (timer) {
    clearInterval(timer);
    timers.delete(id);
  }
}

export function initRunner() {
  if (state.initialized) {
    return;
  }
  state.initialized = true;

  // Create tables
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
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );
  `);

  // Load and schedule active tasks
  const activeTasks = db.prepare("SELECT * FROM tasks WHERE status = 'ACTIVE'").all() as Task[];
  for (const task of activeTasks) {
    scheduleTask(task);
  }
}
