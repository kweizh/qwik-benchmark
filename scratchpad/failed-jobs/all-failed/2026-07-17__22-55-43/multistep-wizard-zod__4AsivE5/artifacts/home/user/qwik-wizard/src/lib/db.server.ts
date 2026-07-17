import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

// Fixed, absolute path as required by the project spec.
const DB_DIR = "/home/user/qwik-wizard/db";
const DB_PATH = path.join(DB_DIR, "app.db");

fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

// Create tables on startup if they don't already exist.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    age INTEGER NOT NULL,
    country TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Server-side storage for in-progress (not yet finalized) wizard submissions,
// keyed by an opaque session id that is only ever exposed to the client via a
// httpOnly cookie. The plaintext password is NEVER stored here -- only its
// one-way hash (computed as soon as the account step is validated).
db.exec(`
  CREATE TABLE IF NOT EXISTS wizard_progress (
    session_id TEXT PRIMARY KEY,
    email TEXT,
    password_hash TEXT,
    full_name TEXT,
    age INTEGER,
    country TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

export interface UserRow {
  id: number;
  email: string;
  password: string;
  full_name: string;
  age: number;
  country: string;
  created_at: string;
}

export interface ProgressRow {
  session_id: string;
  email: string | null;
  password_hash: string | null;
  full_name: string | null;
  age: number | null;
  country: string | null;
  updated_at: string;
}

export function findUserByEmail(email: string): UserRow | undefined {
  return db
    .prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE")
    .get(email) as UserRow | undefined;
}

export function insertUser(user: {
  email: string;
  passwordHash: string;
  fullName: string;
  age: number;
  country: string;
}): number {
  const result = db
    .prepare(
      `INSERT INTO users (email, password, full_name, age, country)
       VALUES (@email, @passwordHash, @fullName, @age, @country)`,
    )
    .run(user);
  return Number(result.lastInsertRowid);
}

export function getProgress(sessionId: string): ProgressRow | undefined {
  return db
    .prepare("SELECT * FROM wizard_progress WHERE session_id = ?")
    .get(sessionId) as ProgressRow | undefined;
}

function ensureProgressRow(sessionId: string) {
  db.prepare(
    `INSERT INTO wizard_progress (session_id) VALUES (?)
     ON CONFLICT(session_id) DO NOTHING`,
  ).run(sessionId);
}

export function saveAccountProgress(
  sessionId: string,
  data: { email: string; passwordHash: string },
) {
  ensureProgressRow(sessionId);
  db.prepare(
    `UPDATE wizard_progress
     SET email = @email, password_hash = @passwordHash, updated_at = CURRENT_TIMESTAMP
     WHERE session_id = @sessionId`,
  ).run({ sessionId, email: data.email, passwordHash: data.passwordHash });
}

export function saveProfileProgress(
  sessionId: string,
  data: { fullName: string; age: number; country: string },
) {
  ensureProgressRow(sessionId);
  db.prepare(
    `UPDATE wizard_progress
     SET full_name = @fullName, age = @age, country = @country, updated_at = CURRENT_TIMESTAMP
     WHERE session_id = @sessionId`,
  ).run({
    sessionId,
    fullName: data.fullName,
    age: data.age,
    country: data.country,
  });
}

export function clearProgress(sessionId: string) {
  db.prepare("DELETE FROM wizard_progress WHERE session_id = ?").run(
    sessionId,
  );
}

export default db;
