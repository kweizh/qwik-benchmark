/**
 * Server-only authentication helpers.
 *
 * This module centralises all access to:
 *   - the local SQLite database (better-sqlite3)
 *   - password hashing / verification via Node's built-in `crypto` (scrypt)
 *   - session lookup by cookie token
 *
 * Because this file ends with `.server.ts`, the Qwik City build ensures it is
 * never bundled into any client code that ships to the browser.
 */
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Database setup
// ---------------------------------------------------------------------------

const DB_FILE = resolve(process.cwd(), "data", "auth.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;

  const dir = dirname(DB_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const db = new Database(DB_FILE);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (username) REFERENCES users(username)
    );
  `);

  // Seed the single required user if it does not exist yet.
  const existing = db
    .prepare("SELECT username FROM users WHERE username = ?")
    .get("alice") as { username: string } | undefined;

  if (!existing) {
    const hash = hashPassword("s3cret-pass");
    db.prepare(
      "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)"
    ).run("alice", hash, Date.now());
  }

  _db = db;
  return db;
}

// ---------------------------------------------------------------------------
// Password hashing (scrypt)
// ---------------------------------------------------------------------------

const SCRYPT_KEYLEN = 64;

export function hashPassword(plain: string): string {
  // 16 byte salt + scrypt-derived 64 byte key, both hex-encoded.
  const salt = randomBytes(16);
  const derived = scryptSync(plain, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const saltHex = parts[1];
  const keyHex = parts[2];
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex, "hex");
    expected = Buffer.from(keyHex, "hex");
  } catch {
    return false;
  }
  if (expected.length !== SCRYPT_KEYLEN) return false;
  const derived = scryptSync(plain, salt, expected.length);
  // Constant-time comparison to avoid timing leaks.
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

// ---------------------------------------------------------------------------
// User / session helpers
// ---------------------------------------------------------------------------

export interface UserRecord {
  id: number;
  username: string;
  password_hash: string;
  created_at: number;
}

export function getUserByUsername(username: string): UserRecord | undefined {
  return getDb()
    .prepare(
      "SELECT id, username, password_hash, created_at FROM users WHERE username = ?"
    )
    .get(username) as UserRecord | undefined;
}

export function createSession(username: string): string {
  const token = randomBytes(32).toString("hex");
  getDb()
    .prepare(
      "INSERT INTO sessions (token, username, created_at) VALUES (?, ?, ?)"
    )
    .run(token, username, Date.now());
  return token;
}

export function getSessionUsername(token: string | undefined): string | null {
  if (!token) return null;
  const row = getDb()
    .prepare("SELECT username FROM sessions WHERE token = ?")
    .get(token) as { username: string } | undefined;
  return row ? row.username : null;
}

export function deleteSession(token: string | undefined): void {
  if (!token) return;
  getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}