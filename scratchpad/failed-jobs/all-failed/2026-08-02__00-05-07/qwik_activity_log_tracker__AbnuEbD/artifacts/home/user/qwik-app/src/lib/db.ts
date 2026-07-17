import sqlite3 from "sqlite3";
import path from "node:path";

/**
 * Activity log persistence layer backed by a local SQLite database.
 *
 * A single shared connection is kept alive for the lifetime of the server
 * process (cached on `globalThis` so dev-mode HMR doesn't leak connections).
 * All writes are funneled through a promise queue so that concurrent
 * requests never issue overlapping `INSERT` statements on the same
 * connection, which keeps things robust under load and avoids
 * `SQLITE_BUSY` errors.
 */

const DB_PATH = path.resolve(process.cwd(), "activity.db");

export interface ActivityLogEntry {
  path: string;
  method: string;
  ip: string;
  timestamp: string;
  duration_ms: number;
}

export interface ActivityLogRow extends ActivityLogEntry {
  id: number;
}

interface ActivityStats {
  total: number;
  averageDuration: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __activityDbPromise__: Promise<sqlite3.Database> | undefined;
  // eslint-disable-next-line no-var
  var __activityWriteQueue__: Promise<unknown> | undefined;
}

function openDb(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }

      db.serialize(() => {
        db.run("PRAGMA journal_mode = WAL;");
        db.run("PRAGMA busy_timeout = 5000;");
        db.run(
          `CREATE TABLE IF NOT EXISTS ActivityLog (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL,
            method TEXT NOT NULL,
            ip TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            duration_ms INTEGER NOT NULL
          )`,
          (createErr) => {
            if (createErr) {
              reject(createErr);
              return;
            }
            resolve(db);
          },
        );
      });
    });
  });
}

function getDb(): Promise<sqlite3.Database> {
  if (!globalThis.__activityDbPromise__) {
    globalThis.__activityDbPromise__ = openDb();
  }
  return globalThis.__activityDbPromise__;
}

/** Appends a write task to the shared queue so writes never overlap. */
function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const previous = globalThis.__activityWriteQueue__ ?? Promise.resolve();
  const result = previous.then(task, task);
  // Keep the queue alive regardless of individual task success/failure.
  globalThis.__activityWriteQueue__ = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export async function insertActivityLog(entry: ActivityLogEntry): Promise<void> {
  const db = await getDb();
  await enqueueWrite(
    () =>
      new Promise<void>((resolve, reject) => {
        db.run(
          `INSERT INTO ActivityLog (path, method, ip, timestamp, duration_ms) VALUES (?, ?, ?, ?, ?)`,
          [entry.path, entry.method, entry.ip, entry.timestamp, entry.duration_ms],
          (err) => {
            if (err) reject(err);
            else resolve();
          },
        );
      }),
  );
}

export async function getActivityStats(): Promise<ActivityStats> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    db.get<{ total: number; avgDuration: number | null }>(
      `SELECT COUNT(*) as total, AVG(duration_ms) as avgDuration FROM ActivityLog`,
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        const total = row?.total ?? 0;
        const avg = row?.avgDuration ?? 0;
        resolve({
          total,
          averageDuration: Math.round((avg || 0) * 100) / 100,
        });
      },
    );
  });
}

export async function getAllActivityLogs(): Promise<ActivityLogRow[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    db.all<ActivityLogRow>(
      `SELECT id, path, method, ip, timestamp, duration_ms FROM ActivityLog ORDER BY timestamp DESC`,
      (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows ?? []);
      },
    );
  });
}
