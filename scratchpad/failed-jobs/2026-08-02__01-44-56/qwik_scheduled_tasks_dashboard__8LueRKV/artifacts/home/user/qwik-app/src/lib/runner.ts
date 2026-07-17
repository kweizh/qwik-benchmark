import { exec } from "child_process";
import { db } from "./db";

const RUNNER_INTERVAL_MS = 1000;

// Use globalThis to persist runner state across Vite hot reloads
interface GlobalRunnerState {
  intervalId?: NodeJS.Timeout;
  runningTasks?: Set<string>;
}

const g = globalThis as unknown as { __runner_state__?: GlobalRunnerState };

if (!g.__runner_state__) {
  g.__runner_state__ = {
    runningTasks: new Set<string>(),
  };
}

const state = g.__runner_state__;

export function executeTaskCommand(taskId: string, command: string): Promise<void> {
  state.runningTasks?.add(taskId);
  return new Promise<void>((resolve) => {
    exec(command, (error) => {
      const status = error ? "FAILED" : "SUCCESS";
      const timestamp = new Date().toISOString();
      try {
        db.prepare(
          "INSERT INTO execution_history (task_id, status, timestamp) VALUES (?, ?, ?)"
        ).run(taskId, status, timestamp);
      } catch (err) {
        console.error("Failed to insert execution history:", err);
      } finally {
        state.runningTasks?.delete(taskId);
      }
      resolve();
    });
  });
}

function pollAndRunTasks() {
  try {
    // 1. Fetch all ACTIVE tasks
    const activeTasks = db.prepare("SELECT * FROM tasks WHERE status = 'ACTIVE'").all() as Array<{
      id: string;
      name: string;
      command: string;
      interval_seconds: number;
      status: string;
    }>;

    const now = Date.now();

    for (const task of activeTasks) {
      // If task is already running, skip it
      if (state.runningTasks?.has(task.id)) {
        continue;
      }

      // Query the latest history for this task
      const latestHistory = db.prepare(
        "SELECT timestamp FROM execution_history WHERE task_id = ? ORDER BY timestamp DESC LIMIT 1"
      ).get(task.id) as { timestamp: string } | undefined;

      let shouldRun = false;
      if (!latestHistory) {
        shouldRun = true;
      } else {
        const lastRunTime = new Date(latestHistory.timestamp).getTime();
        const elapsedSeconds = (now - lastRunTime) / 1000;
        if (elapsedSeconds >= task.interval_seconds) {
          shouldRun = true;
        }
      }

      if (shouldRun) {
        // Execute in the background (no await)
        executeTaskCommand(task.id, task.command).catch((err) => {
          console.error(`Error executing task ${task.id}:`, err);
        });
      }
    }
  } catch (err) {
    console.error("Error in background runner poll:", err);
  }
}

export function startRunner() {
  if (state.intervalId) {
    // Already running
    return;
  }

  // Start polling
  state.intervalId = setInterval(pollAndRunTasks, RUNNER_INTERVAL_MS);
  // Also run once immediately
  pollAndRunTasks();
}

export function stopRunner() {
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = undefined;
  }
}

// Automatically start runner when imported on server
startRunner();
