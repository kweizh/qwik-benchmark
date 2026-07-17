import Database from 'better-sqlite3';

let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    db = new Database('/home/user/qwik-app/poll.db', { timeout: 5000 });
    // Enable WAL mode for high concurrency and performance
    db.pragma('journal_mode = WAL');
  }
  return db;
}
