import sqlite3 from "sqlite3";

const dbPath = "/home/user/qwik-app/activity.db";

// Create a single database connection
const db = new sqlite3.Database(dbPath);

// Promisify database operations
export const dbRun = (sql: string, params: any[] = []): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
};

export const dbGet = <T>(sql: string, params: any[] = []): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
};

export const dbAll = <T>(sql: string, params: any[] = []): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
};

// Initialize database table
let initPromise: Promise<void> | null = null;

export const initDb = (): Promise<void> => {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await dbRun(`
      CREATE TABLE IF NOT EXISTS ActivityLog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT NOT NULL,
        method TEXT NOT NULL,
        ip TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        duration_ms INTEGER NOT NULL
      )
    `);
  })();

  return initPromise;
};

export interface ActivityLog {
  id: number;
  path: string;
  method: string;
  ip: string;
  timestamp: string;
  duration_ms: number;
}

export async function logActivity(
  path: string,
  method: string,
  ip: string,
  timestamp: string,
  duration_ms: number,
): Promise<void> {
  await initDb();
  await dbRun(
    "INSERT INTO ActivityLog (path, method, ip, timestamp, duration_ms) VALUES (?, ?, ?, ?, ?)",
    [path, method, ip, timestamp, duration_ms],
  );
}

export async function getStats(): Promise<{
  total_requests: number;
  average_duration_ms: number;
}> {
  await initDb();
  const statsRow = await dbGet<{
    total_requests: number;
    average_duration_ms: number | null;
  }>(
    "SELECT COUNT(*) as total_requests, AVG(duration_ms) as average_duration_ms FROM ActivityLog",
  );

  const total_requests = statsRow?.total_requests || 0;
  const raw_avg = statsRow?.average_duration_ms || 0;
  const average_duration_ms = raw_avg ? parseFloat(raw_avg.toFixed(2)) : 0;

  return {
    total_requests,
    average_duration_ms,
  };
}

export async function getLogs(): Promise<ActivityLog[]> {
  await initDb();
  return dbAll<ActivityLog>(
    "SELECT id, path, method, ip, timestamp, duration_ms FROM ActivityLog ORDER BY timestamp DESC",
  );
}
