import Database from "better-sqlite3";
import path from "node:path";

// Resolve the database path to the fixed location required by the spec.
const DB_PATH =
  process.env.QWIK_APP_DB_PATH || path.resolve("/home/user/qwik-app/db.sqlite");

// Use a module-level singleton so we don't open a new connection per-request.
// This, combined with WAL mode, avoids SQLITE_BUSY errors under concurrent access.
let _db: Database.Database | undefined;

function createConnection(): Database.Database {
  const db = new Database(DB_PATH);

  // WAL mode allows concurrent readers while a writer is active, and a busy
  // timeout makes writers wait instead of immediately failing when the DB
  // is momentarily locked by another connection/process.
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      hashed_key TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
      created_at TEXT NOT NULL
    );
  `);

  return db;
}

export function getDb(): Database.Database {
  if (!_db) {
    _db = createConnection();
  }
  return _db;
}
