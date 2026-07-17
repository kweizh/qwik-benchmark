/**
 * Server-only module: SQLite persistence + password hashing + session management.
 *
 * Everything in this file runs exclusively on the server (it is a `*.server.ts`
 * module and is only ever imported from `routeAction$` / `routeLoader$` /
 * `onRequest` boundaries), so none of this code can leak into client bundles.
 */
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database, { type Database as DBConnection } from "better-sqlite3";

export type User = {
  id: number;
  username: string;
};

const SCRYPT_KEYLEN = 64;
const SCRYPT_SALTLEN = 16;
const SCRYPT_PARAMS: Record<string, number> = { N: 16384, r: 8, p: 1 } as const;

// Store the database file under the project directory so everything stays local.
const DB_PATH = join(process.cwd(), "data", "auth.db");

let db: DBConnection | null = null;

function getDb(): DBConnection {
  if (db) return db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const database = new Database(DB_PATH);
  database.pragma("journal_mode = WAL");
  initSchema(database);
  seed(database);
  db = database;
  return database;
}

function initSchema(database: DBConnection) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT NOT NULL UNIQUE,
      salt       TEXT NOT NULL,
      hash       TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      username   TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
}

function seed(database: DBConnection) {
  const existing = database
    .prepare("SELECT id FROM users WHERE username = ?")
    .get("alice");
  if (existing) return;
  const { salt, hash } = hashPassword("s3cret-pass");
  database
    .prepare("INSERT INTO users (username, salt, hash) VALUES (?, ?, ?)")
    .run("alice", salt, hash);
}

/* ------------------------------------------------------------------ */
/* Password hashing (Node built-in crypto, scrypt)                    */
/* ------------------------------------------------------------------ */

export function hashPassword(password: string): {
  salt: string;
  hash: string;
} {
  const salt = randomBytes(SCRYPT_SALTLEN);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS);
  return { salt: salt.toString("hex"), hash: hash.toString("hex") };
}

export function verifyPassword(
  password: string,
  saltHex: string,
  hashHex: string,
): boolean {
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS);
  return (
    actual.length === expected.length &&
    timingSafeEqual(actual, expected)
  );
}

/* ------------------------------------------------------------------ */
/* Users                                                              */
/* ------------------------------------------------------------------ */

export function authenticateUser(
  username: string,
  password: string,
): User | null {
  const database = getDb();
  const row = database
    .prepare("SELECT id, username, salt, hash FROM users WHERE username = ?")
    .get(username) as
    | { id: number; username: string; salt: string; hash: string }
    | undefined;
  if (!row) return null;
  if (!verifyPassword(password, row.salt, row.hash)) return null;
  return { id: row.id, username: row.username };
}

/* ------------------------------------------------------------------ */
/* Sessions                                                           */
/* ------------------------------------------------------------------ */

function newToken(): string {
  // 32 random bytes -> 64 hex chars. Also fold in a sha256 of randomness for
  // a bit of extra entropy, though randomBytes alone is plenty.
  return (
    randomBytes(32).toString("hex") +
    createHash("sha256").update(randomBytes(16)).digest("hex")
  );
}

export function createSession(username: string): string {
  const database = getDb();
  const token = newToken();
  database
    .prepare(
      "INSERT INTO sessions (token, username, created_at) VALUES (?, ?, ?)",
    )
    .run(token, username, Date.now());
  return token;
}

export function getSessionUser(token: string): string | null {
  const database = getDb();
  const row = database
    .prepare("SELECT username FROM sessions WHERE token = ?")
    .get(token) as { username: string } | undefined;
  return row ? row.username : null;
}

export function deleteSession(token: string): void {
  const database = getDb();
  database.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}