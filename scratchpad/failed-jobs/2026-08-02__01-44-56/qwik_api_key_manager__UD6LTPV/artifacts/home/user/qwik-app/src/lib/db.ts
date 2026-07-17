import Database from 'better-sqlite3';
import crypto from 'crypto';

const DB_PATH = '/home/user/qwik-app/db.sqlite';

const db = new Database(DB_PATH, { timeout: 5000 });

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    hashed_key TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
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
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomStr = '';
  const bytes = crypto.randomBytes(32);
  for (let i = 0; i < 32; i++) {
    randomStr += chars[bytes[i] % chars.length];
  }
  return `qk_${randomStr}`;
}

export function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function createApiKey(name: string): { row: Omit<ApiKeyRow, 'hashed_key'>; plainTextKey: string } {
  const plainTextKey = generateApiKey();
  const prefix = plainTextKey.substring(0, 7);
  const hashed = hashKey(plainTextKey);
  const status = 'active';
  const createdAt = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO api_keys (name, key_prefix, hashed_key, status, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(name, prefix, hashed, status, createdAt);
  const id = Number(result.lastInsertRowid);

  return {
    row: {
      id,
      name,
      key_prefix: prefix,
      status,
      created_at: createdAt,
    },
    plainTextKey,
  };
}

export function listApiKeys(): Omit<ApiKeyRow, 'hashed_key'>[] {
  const stmt = db.prepare(`
    SELECT id, name, key_prefix, status, created_at
    FROM api_keys
    ORDER BY id DESC
  `);
  return stmt.all() as Omit<ApiKeyRow, 'hashed_key'>[];
}

export function revokeApiKey(id: number): boolean {
  const checkStmt = db.prepare('SELECT id FROM api_keys WHERE id = ?');
  const exists = checkStmt.get(id);
  if (!exists) {
    return false;
  }

  const stmt = db.prepare(`
    UPDATE api_keys
    SET status = 'revoked'
    WHERE id = ?
  `);
  stmt.run(id);
  return true;
}

export function verifyApiKey(plainTextKey: string): boolean {
  const hashed = hashKey(plainTextKey);
  const stmt = db.prepare(`
    SELECT id FROM api_keys
    WHERE hashed_key = ? AND status = 'active'
  `);
  const row = stmt.get(hashed);
  return !!row;
}
