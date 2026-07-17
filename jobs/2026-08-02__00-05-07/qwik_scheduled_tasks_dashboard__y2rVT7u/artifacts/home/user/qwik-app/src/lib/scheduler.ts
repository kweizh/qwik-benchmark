/**
 * Background scheduled-task runner.
 *
 * This module polls the SQLite `tasks` table on a fixed tick and executes any
 * `ACTIVE` task whose interval has elapsed, logging the result of each run to
 * the `execution_history` table. It is designed to run in-process alongside
 * the Qwik City dev/production server without blocking the main thread: task
 * commands are spawned asynchronously via `child_process.exec`.
 *
 * The module is idempotent - calling `startScheduler()` multiple times (e.g.
 * because it's imported from several entry points) will only ever start a
 * single polling interval per process, using a `globalThis` guard so it also
 * survives Vite's module graph re-evaluation during dev.
 */
import { exec } from "node:child_process";
import { getAllTasks, insertHistory } from "./db";

const TICK_MS = 1000;

interface SchedulerState {
  started: boolean;
  lastRun: Map<string, number>;
  running: Set<string>;
}

declare global {
  // eslint-disable-next-line no-var
  var __taskScheduler: SchedulerState | undefined;
}

function state(): SchedulerState {
  if (!globalThis.__taskScheduler) {
    globalThis.__taskScheduler = {
      started: false,
      lastRun: new Map(),
      running: new Set(),
    };
  }
  return globalThis.__taskScheduler;
}

/** Executes a task's command and records the outcome in execution_history. */
function runTask(taskId: string, command: string) {
  const s = state();
  if (s.running.has(taskId)) {
    // Previous execution of this task is still in-flight; skip this tick.
    return;
  }
  s.running.add(taskId);

  exec(command, { timeout: 0 }, (error) => {
    const status = error ? "FAILED" : "SUCCESS";
    const timestamp = new Date().toISOString();
    try {
      insertHistory(taskId, status, timestamp);
    } catch (e) {
      console.error(`[scheduler] failed to log history for task ${taskId}:`, e);
    } finally {
      s.running.delete(taskId);
    }
  });
}

/** Triggers a task's command immediately, outside of its normal interval. */
export function triggerTaskNow(taskId: string, command: string): void {
  state().lastRun.set(taskId, Date.now());
  runTask(taskId, command);
}

function tick() {
  const s = state();
  const now = Date.now();

  let tasks;
  try {
    tasks = getAllTasks();
  } catch (e) {
    console.error("[scheduler] failed to load tasks:", e);
    return;
  }

  for (const task of tasks) {
    if (task.status !== "ACTIVE") continue;

    const last = s.lastRun.get(task.id) ?? 0;
    const intervalMs = Math.max(1, task.interval_seconds) * 1000;

    if (now - last >= intervalMs) {
      // Record lastRun before the (async) command finishes so a slow-running
      // command doesn't cause the same task to be re-triggered every tick.
      s.lastRun.set(task.id, now);
      runTask(task.id, task.command);
    }
  }
}

/** Starts the background polling loop. Safe to call more than once. */
export function startScheduler(): void {
  const s = state();
  if (s.started) return;
  s.started = true;

  const timer = setInterval(tick, TICK_MS);
  // Don't let the timer itself keep the process alive if nothing else does.
  timer.unref?.();

  console.log("[scheduler] background task scheduler started");
}

// Self-start as soon as this module is loaded anywhere in the process.
startScheduler();
