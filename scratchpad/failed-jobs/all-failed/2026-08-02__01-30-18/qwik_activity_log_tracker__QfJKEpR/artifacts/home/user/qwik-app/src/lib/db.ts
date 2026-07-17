import sqlite3 from 'sqlite3';

const dbPath = '/home/user/qwik-app/activity.db';

let dbInstance: sqlite3.Database | null = null;
let initPromise: Promise<sqlite3.Database> | null = null;

export function getDb(): Promise<sqlite3.Database> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        initPromise = null;
        reject(err);
      } else {
        db.run(
          `CREATE TABLE IF NOT EXISTS ActivityLog (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL,
            method TEXT NOT NULL,
            ip TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            duration_ms INTEGER NOT NULL
          )`,
          (err) => {
            if (err) {
              initPromise = null;
              reject(err);
            } else {
              dbInstance = db;
              resolve(db);
            }
          }
        );
      }
    });
  });

  return initPromise;
}

export interface ActivityLogEntry {
  id: number;
  path: string;
  method: string;
  ip: string;
  timestamp: string;
  duration_ms: number;
}

export async function insertActivityLog(log: Omit<ActivityLogEntry, 'id'>): Promise<void> {
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

export async function getActivityLogs(): Promise<ActivityLogEntry[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, path, method, ip, timestamp, duration_ms FROM ActivityLog ORDER BY timestamp DESC`,
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as ActivityLogEntry[]);
        }
      }
    );
  });
}

export async function getActivityMetrics(): Promise<{ total_requests: number; average_duration_ms: number }> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT COUNT(*) as total_requests, AVG(duration_ms) as average_duration FROM ActivityLog`,
      (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          const total_requests = row?.total_requests || 0;
          const average_duration = row?.average_duration || 0;
          const average_duration_ms = total_requests > 0 ? parseFloat(average_duration.toFixed(2)) : 0;
          resolve({
            total_requests,
            average_duration_ms,
          });
        }
      }
    );
  });
}
