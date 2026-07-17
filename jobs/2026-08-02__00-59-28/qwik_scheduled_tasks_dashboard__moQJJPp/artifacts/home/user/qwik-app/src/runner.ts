import { exec } from "child_process";
import { getAllTasks, addExecutionHistory, getDb } from "./db";

let runnerInterval: ReturnType<typeof setInterval> | null = null;
// Track last execution time per task to respect interval_seconds
const lastExecutionTime: Map<string, number> = new Map();

export function startRunner(): void {
  if (runnerInterval) return;

  // Poll every second to check for tasks that need execution
  runnerInterval = setInterval(() => {
    try {
      const tasks = getAllTasks();
      const now = Date.now();

      for (const task of tasks) {
        if (task.status !== "ACTIVE") continue;

        const lastTime = lastExecutionTime.get(task.id) || 0;
        const intervalMs = task.interval_seconds * 1000;

        if (now - lastTime >= intervalMs) {
          lastExecutionTime.set(task.id, now);
          executeTask(task.id, task.command);
        }
      }
    } catch (err) {
      console.error("Runner error:", err);
    }
  }, 1000);

  console.log("[Runner] Background task runner started");
}

export function stopRunner(): void {
  if (runnerInterval) {
    clearInterval(runnerInterval);
    runnerInterval = null;
    console.log("[Runner] Background task runner stopped");
  }
}

export function executeTask(taskId: string, command: string): void {
  exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
    const status = error ? ("FAILED" as const) : ("SUCCESS" as const);
    const timestamp = new Date().toISOString();

    if (stdout) console.log(`[Task ${taskId}] stdout:`, stdout.trim());
    if (stderr) console.error(`[Task ${taskId}] stderr:`, stderr.trim());

    try {
      addExecutionHistory(taskId, status, timestamp);
      console.log(`[Task ${taskId}] Executed: ${status} at ${timestamp}`);
    } catch (err) {
      console.error(`[Task ${taskId}] Failed to log execution:`, err);
    }
  });
}

export function triggerTask(taskId: string, command: string): void {
  executeTask(taskId, command);
}
