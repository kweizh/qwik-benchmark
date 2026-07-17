import sqlite3Pkg from "sqlite3";

const sqlite3 = (sqlite3Pkg as any).default || sqlite3Pkg;
const DB_PATH = "/home/user/qwik-app/activity.db";

let dbInstance: any = null;

export function getDb(): any {
  if (!dbInstance) {
    dbInstance = new sqlite3.Database(DB_PATH);
    // Configure SQLite for high concurrency and robustness
    dbInstance.serialize(() => {
      dbInstance.run("PRAGMA journal_mode = WAL;");
      dbInstance.run("PRAGMA busy_timeout = 5000;");
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS ActivityLog (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          path TEXT NOT NULL,
          method TEXT NOT NULL,
          ip TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          duration_ms INTEGER NOT NULL
        )
      `);
    });
  }
  return dbInstance;
}

export function runQuery(sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.run(sql, params, function (this: any, err: Error | null) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export function getQuery<T>(
  sql: string,
  params: any[] = [],
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.get(sql, params, (err: Error | null, row: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(row as T);
      }
    });
  });
}

export function allQuery<T>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.all(sql, params, (err: Error | null, rows: any[]) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows as T[]);
      }
    });
  });
}
