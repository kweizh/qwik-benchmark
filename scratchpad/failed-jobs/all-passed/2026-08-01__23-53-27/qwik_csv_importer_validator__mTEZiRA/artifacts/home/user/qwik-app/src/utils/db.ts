import sqlite3 from 'sqlite3';

const dbPath = '/home/user/qwik-app/database.sqlite';

class Mutex {
  private queue: (() => void)[] = [];
  private locked = false;

  async acquire(): Promise<() => void> {
    if (!this.locked) {
      this.locked = true;
      return () => this.release();
    }
    return new Promise<() => void>((resolve) => {
      this.queue.push(() => resolve(() => this.release()));
    });
  }

  private release() {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next?.();
    } else {
      this.locked = false;
    }
  }
}

export const dbMutex = new Mutex();

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
        return;
      }

      // Configure busy timeout
      db.run("PRAGMA busy_timeout = 30000", (pragmaErr) => {
        if (pragmaErr) {
          initPromise = null;
          reject(pragmaErr);
          return;
        }

        db.run(
          `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            age INTEGER NOT NULL
          )`,
          (createErr) => {
            if (createErr) {
              initPromise = null;
              reject(createErr);
            } else {
              dbInstance = db;
              resolve(db);
            }
          }
        );
      });
    });
  });

  return initPromise;
}

export function dbAll<T>(db: sqlite3.Database, sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

export function dbRun(db: sqlite3.Database, sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (this: sqlite3.RunResult, err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}
