import Database from 'better-sqlite3';

const DB_PATH = '/home/user/qwik-app/kanban.db';

export interface Task {
  id: number;
  title: string;
  column: 'TODO' | 'IN_PROGRESS' | 'DONE';
  position: number;
}

let db: Database.Database;

if ((globalThis as any).__db) {
  db = (globalThis as any).__db;
} else {
  db = new Database(DB_PATH);
  
  // Create table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      column TEXT NOT NULL CHECK(column IN ('TODO', 'IN_PROGRESS', 'DONE')),
      position INTEGER NOT NULL
    );
  `);
  
  (globalThis as any).__db = db;
}

export { db };
