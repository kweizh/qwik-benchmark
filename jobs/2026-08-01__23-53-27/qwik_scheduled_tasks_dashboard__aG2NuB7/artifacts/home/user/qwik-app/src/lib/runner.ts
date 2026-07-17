import { exec } from "child_process";
import { db } from "./db";

const lastExecuted: Record<string, number> = {};

export function executeTask(id: string, command: string) {
  console.log(`[Runner] Executing task "${id}": ${command}`);
  exec(command, (error) => {
    const status = error ? "FAILED" : "SUCCESS";
    const timestamp = new Date().toISOString();
    console.log(`[Runner] Task "${id}" finished with status ${status}`);
    try {
      db.prepare(
        "INSERT INTO execution_history (task_id, status, timestamp) VALUES (?, ?, ?)"
      ).run(id, status, timestamp);
    } catch (err) {
      console.error(`[Runner] Failed to log execution history for task "${id}":`, err);
    }
  });
}

export function triggerTask(id: string): boolean {
  try {
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as any;
    if (!task) {
      return false;
    }
    // Execute immediately
    executeTask(task.id, task.command);
    // If active, update lastExecuted to reset interval timer
    if (task.status === "ACTIVE") {
      lastExecuted[task.id] = Date.now();
    }
    return true;
  } catch (err) {
    console.error(`[Runner] Error manually triggering task "${id}":`, err);
    return false;
  }
}

let intervalId: NodeJS.Timeout | null = null;

export function startRunner() {
  if (intervalId) {
    return;
  }

  console.log("[Runner] Starting background runner...");

  intervalId = setInterval(() => {
    try {
      const activeTasks = db.prepare("SELECT * FROM tasks WHERE status = 'ACTIVE'").all() as any[];
      const activeIds = new Set<string>();
      const now = Date.now();

      for (const task of activeTasks) {
        activeIds.add(task.id);
        const lastRun = lastExecuted[task.id];

        if (lastRun === undefined) {
          // First time seeing this active task (or resumed). Run immediately.
          executeTask(task.id, task.command);
          lastExecuted[task.id] = now;
        } else if (now - lastRun >= task.interval_seconds * 1000) {
          // Interval reached. Run again.
          executeTask(task.id, task.command);
          lastExecuted[task.id] = now;
        }
      }

      // Cleanup lastExecuted for tasks that are no longer active
      for (const id of Object.keys(lastExecuted)) {
        if (!activeIds.has(id)) {
          delete lastExecuted[id];
        }
      }
    } catch (err) {
      console.error("[Runner] Error in background runner tick:", err);
    }
  }, 1000);
}
export { lastExecuted };
