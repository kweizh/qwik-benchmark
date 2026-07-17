import { exec } from 'child_process';
import { getDb, addExecutionHistory, Task } from '../db/db';

const lastRunTimes = new Map<string, number>();

export function executeTaskCommand(taskId: string, command: string): void {
  exec(command, (error) => {
    const status = error ? 'FAILED' : 'SUCCESS';
    const timestamp = new Date().toISOString();
    try {
      addExecutionHistory({
        task_id: taskId,
        status,
        timestamp,
      });
    } catch (err) {
      console.error(`Failed to add execution history for task ${taskId}:`, err);
    }
  });
}

function pollAndRunTasks() {
  try {
    const db = getDb();
    // Fetch active tasks
    const activeTasks = db.prepare("SELECT * FROM tasks WHERE status = 'ACTIVE'").all() as Task[];
    const activeTaskIds = new Set<string>();

    const now = Date.now();

    for (const task of activeTasks) {
      activeTaskIds.add(task.id);

      if (!lastRunTimes.has(task.id)) {
        // First time seeing this active task, set its last run time to now
        // so that it will run after its interval_seconds.
        lastRunTimes.set(task.id, now);
        continue;
      }

      const lastRun = lastRunTimes.get(task.id)!;
      const intervalMs = task.interval_seconds * 1000;

      if (now - lastRun >= intervalMs) {
        // Update last run time first to prevent double execution if exec takes long
        lastRunTimes.set(task.id, now);
        // Execute command in the background
        executeTaskCommand(task.id, task.command);
      }
    }

    // Clean up lastRunTimes for tasks that are no longer active
    for (const id of lastRunTimes.keys()) {
      if (!activeTaskIds.has(id)) {
        lastRunTimes.delete(id);
      }
    }
  } catch (err) {
    console.error('Error in background runner polling loop:', err);
  }
}

export function startBackgroundRunner(): void {
  const globalAny = globalThis as any;
  if (globalAny.__backgroundRunnerInterval) {
    // Already running
    return;
  }

  console.log('Starting background scheduled tasks runner...');
  // Run polling loop every 1 second (1000ms)
  globalAny.__backgroundRunnerInterval = setInterval(pollAndRunTasks, 1000);
}

export function stopBackgroundRunner(): void {
  const globalAny = globalThis as any;
  if (globalAny.__backgroundRunnerInterval) {
    clearInterval(globalAny.__backgroundRunnerInterval);
    globalAny.__backgroundRunnerInterval = null;
    console.log('Stopped background scheduled tasks runner.');
  }
}
