import Database from 'better-sqlite3';

const dbPath = '/home/user/qwik-app/kanban.db';

const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize the table
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    column TEXT NOT NULL CHECK(column IN ('TODO', 'IN_PROGRESS', 'DONE')),
    position INTEGER NOT NULL
  )
`);

export default db;
export interface Task {
  id: number;
  title: string;
  column: 'TODO' | 'IN_PROGRESS' | 'DONE';
  position: number;
}
