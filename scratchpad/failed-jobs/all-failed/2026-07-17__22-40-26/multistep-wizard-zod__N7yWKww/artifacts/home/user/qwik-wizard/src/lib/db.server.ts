import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = "/home/user/qwik-wizard/db/app.db";

/**
 * Lazily-initialized, module-scoped SQLite handle.
 *
 * Lives in a `*.server.ts` module so the import is stripped from the client bundle
 * by the Qwik compiler.
 */
let _db: Database.Database | null = null;

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function init(): Database.Database {
  ensureDir(DB_PATH);
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      age INTEGER NOT NULL,
      country TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}

export function getDb(): Database.Database {
  if (!_db) {
    _db = init();
  }
  return _db;
}

export interface UserRow {
  id: number;
  email: string;
  password: string;
  full_name: string;
  age: number;
  country: string;
  created_at: string;
}

export function findUserByEmail(email: string): UserRow | undefined {
  const stmt = getDb().prepare(
    "SELECT id, email, password, full_name, age, country, created_at FROM users WHERE email = ?",
  );
  return stmt.get(email) as UserRow | undefined;
}

export interface NewUser {
  email: string;
  passwordHash: string;
  fullName: string;
  age: number;
  country: string;
}

export function createUser(input: NewUser): UserRow {
  const stmt = getDb().prepare(
    "INSERT INTO users (email, password, full_name, age, country) VALUES (?, ?, ?, ?, ?)",
  );
  const result = stmt.run(
    input.email,
    input.passwordHash,
    input.fullName,
    input.age,
    input.country,
  );
  const created = getDb()
    .prepare(
      "SELECT id, email, password, full_name, age, country, created_at FROM users WHERE id = ?",
    )
    .get(result.lastInsertRowid) as UserRow;
  return created;
}