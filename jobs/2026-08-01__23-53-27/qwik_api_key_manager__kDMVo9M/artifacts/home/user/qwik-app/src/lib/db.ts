import Database from 'better-sqlite3';
import { randomInt, createHash } from 'crypto';

const dbPath = '/home/user/qwik-app/db.sqlite';

const db = new Database(dbPath);

// Enable WAL mode and set busy timeout to handle concurrency safely
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    hashed_key TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);

export interface ApiKeyRecord {
  id: number;
  name: string;
  key_prefix: string;
  hashed_key: string;
  status: 'active' | 'revoked';
  created_at: string;
}

export function generateApiKey(): { fullKey: string; prefix: string; hashedKey: string } {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomPart = '';
  for (let i = 0; i < 32; i++) {
    randomPart += chars[randomInt(0, chars.length)];
  }
  const fullKey = 'qk_' + randomPart;
  const prefix = fullKey.substring(0, 7);
  const hashedKey = createHash('sha256').update(fullKey).digest('hex');
  return { fullKey, prefix, hashedKey };
}

export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export default db;
