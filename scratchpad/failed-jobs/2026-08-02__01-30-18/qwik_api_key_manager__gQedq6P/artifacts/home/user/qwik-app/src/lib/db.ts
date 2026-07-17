import Database from 'better-sqlite3';
import { randomBytes, createHash } from 'crypto';

const dbPath = '/home/user/qwik-app/db.sqlite';

const db = new Database(dbPath);

// Enable WAL mode for better concurrency and prevent locking issues
db.pragma('journal_mode = WAL');

// Initialize table
db.exec(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    hashed_key TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('active', 'revoked')),
    created_at TEXT NOT NULL
  )
`);

export interface ApiKeyRow {
  id: number;
  name: string;
  key_prefix: string;
  hashed_key: string;
  status: 'active' | 'revoked';
  created_at: string;
}

export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'qk_';
  while (result.length < 35) {
    const byte = randomBytes(1)[0];
    if (byte < 248) { // 62 * 4 = 248
      result += chars[byte % 62];
    }
  }
  return result;
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export default db;
