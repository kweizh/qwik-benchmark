import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DB_DIR = "/home/user/qwik-wizard/db";
const DB_PATH = path.join(DB_DIR, "app.db");

// Ensure directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize database
export const db = new Database(DB_PATH);

// Ensure tables exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    age INTEGER NOT NULL,
    country TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function getUserByEmail(email: string) {
  const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
  return stmt.get(email) as any;
}

export function createUser(user: {
  email: string;
  passwordHash: string;
  fullName: string;
  age: number;
  country: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO users (email, password, full_name, age, country)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(user.email, user.passwordHash, user.fullName, user.age, user.country);
}

// Session database operations
export function getDbSession(id: string) {
  const stmt = db.prepare("SELECT data FROM sessions WHERE id = ?");
  const row = stmt.get(id) as { data: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.data);
  } catch {
    return null;
  }
}

export function saveDbSession(id: string, data: any) {
  const stmt = db.prepare(`
    INSERT INTO sessions (id, data, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP
  `);
  stmt.run(id, JSON.stringify(data));
}

export function deleteDbSession(id: string) {
  const stmt = db.prepare("DELETE FROM sessions WHERE id = ?");
  stmt.run(id);
}
