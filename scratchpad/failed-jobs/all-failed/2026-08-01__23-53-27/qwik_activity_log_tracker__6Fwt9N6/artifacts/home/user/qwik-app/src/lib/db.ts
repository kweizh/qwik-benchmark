import sqlite3 from "sqlite3";

const DB_PATH = "/home/user/qwik-app/activity.db";

const sqlite = sqlite3.verbose();
let dbPromise: Promise<sqlite3.Database> | null = null;

export function getDb(): Promise<sqlite3.Database> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const database = new sqlite.Database(DB_PATH, (err) => {
      if (err) {
        dbPromise = null; // Reset on failure so we can retry
        return reject(err);
      }
      database.run(
        `CREATE TABLE IF NOT EXISTS ActivityLog (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          path TEXT NOT NULL,
          method TEXT NOT NULL,
          ip TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          duration_ms INTEGER NOT NULL
        )`,
        (tableErr) => {
          if (tableErr) {
            dbPromise = null;
            return reject(tableErr);
          }
          resolve(database);
        }
      );
    });
  });

  return dbPromise;
}

export interface LogEntry {
  id: number;
  path: string;
  method: string;
  ip: string;
  timestamp: string;
  duration_ms: number;
}

export interface ActivityStats {
  total_requests: number;
  average_duration_ms: number;
  logs: LogEntry[];
}

export async function logActivity(log: {
  path: string;
  method: string;
  ip: string;
  timestamp: string;
  duration_ms: number;
}): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO ActivityLog (path, method, ip, timestamp, duration_ms) VALUES (?, ?, ?, ?, ?)`,
      [log.path, log.method, log.ip, log.timestamp, log.duration_ms],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

export async function getActivityStats(): Promise<ActivityStats> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, path, method, ip, timestamp, duration_ms FROM ActivityLog ORDER BY timestamp DESC`,
      [],
      (err, rows: any[]) => {
        if (err) {
          return reject(err);
        }
        const logs: LogEntry[] = rows.map((row) => ({
          id: row.id,
          path: row.path,
          method: row.method,
          ip: row.ip,
          timestamp: row.timestamp,
          duration_ms: row.duration_ms,
        }));

        const total_requests = logs.length;
        let average_duration_ms = 0;
        if (total_requests > 0) {
          const sum = logs.reduce((acc, log) => acc + log.duration_ms, 0);
          average_duration_ms = Math.round((sum / total_requests) * 100) / 100;
        }

        resolve({
          total_requests,
          average_duration_ms,
          logs,
        });
      }
    );
  });
}
