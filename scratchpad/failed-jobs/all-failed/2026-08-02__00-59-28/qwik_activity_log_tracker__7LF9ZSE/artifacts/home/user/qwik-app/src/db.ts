import sqlite3 from "sqlite3";
import { join } from "node:path";

const { Database } = sqlite3;

const DB_PATH = join(process.cwd(), "activity.db");

let db: Database | null = null;

function getDb(): Promise<Database> {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }
    const instance = new Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }
      db = instance;
      // Create the table if it doesn't exist
      instance.run(
        `CREATE TABLE IF NOT EXISTS ActivityLog (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          path TEXT NOT NULL,
          method TEXT NOT NULL,
          ip TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          duration_ms INTEGER NOT NULL
        )`,
        (err2) => {
          if (err2) {
            reject(err2);
            return;
          }
          resolve(instance);
        }
      );
    });
  });
}

export interface LogEntry {
  path: string;
  method: string;
  ip: string;
  timestamp: string;
  duration_ms: number;
}

export interface ActivityLogRow extends LogEntry {
  id: number;
}

export function insertLog(entry: LogEntry): Promise<void> {
  return new Promise((resolve, reject) => {
    getDb().then((database) => {
      database.run(
        "INSERT INTO ActivityLog (path, method, ip, timestamp, duration_ms) VALUES (?, ?, ?, ?, ?)",
        [entry.path, entry.method, entry.ip, entry.timestamp, entry.duration_ms],
        function (err) {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        }
      );
    }).catch(reject);
  });
}

export function getTotalRequests(): Promise<number> {
  return new Promise((resolve, reject) => {
    getDb().then((database) => {
      database.get<{ count: number }>(
        "SELECT COUNT(*) as count FROM ActivityLog",
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row ? row.count : 0);
        }
      );
    }).catch(reject);
  });
}

export function getAverageDuration(): Promise<number> {
  return new Promise((resolve, reject) => {
    getDb().then((database) => {
      database.get<{ avg: number | null }>(
        "SELECT AVG(duration_ms) as avg FROM ActivityLog",
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row && row.avg !== null ? Math.round(row.avg * 100) / 100 : 0);
        }
      );
    }).catch(reject);
  });
}

export function getAllLogs(): Promise<ActivityLogRow[]> {
  return new Promise((resolve, reject) => {
    getDb().then((database) => {
      database.all<ActivityLogRow>(
        "SELECT * FROM ActivityLog ORDER BY timestamp DESC",
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows || []);
        }
      );
    }).catch(reject);
  });
}
