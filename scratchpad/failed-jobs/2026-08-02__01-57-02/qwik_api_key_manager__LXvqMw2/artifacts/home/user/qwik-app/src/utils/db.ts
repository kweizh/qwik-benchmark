import Database from 'better-sqlite3';

const dbPath = '/home/user/qwik-app/db.sqlite';

// Initialize connection with a busy timeout of 5000ms
const db = new Database(dbPath, { timeout: 5000 });

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');

// Ensure tables exist
db.exec(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    hashed_key TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_api_keys_hashed_key ON api_keys (hashed_key);
`);

export default db;
export interface ApiKeyRow {
  id: number;
  name: string;
  key_prefix: string;
  hashed_key: string;
  status: 'active' | 'revoked';
  created_at: string;
}
