import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";

const DB_PATH = join(process.cwd(), ".data", "app.db");

let dbInstance: Database.Database | null = null;

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = scryptSync(password, salt, 64);
  if (keyBuffer.length !== derivedKey.length) return false;
  return timingSafeEqual(keyBuffer, derivedKey);
}

function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  const existing = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get("alice");

  if (!existing) {
    db.prepare(
      "INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)",
    ).run(randomUUID(), "alice", hashPassword("s3cret-pass"));
  }

  dbInstance = db;
  return db;
}

export interface User {
  id: string;
  username: string;
}

export function findUserByCredentials(
  username: string,
  password: string,
): User | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT id, username, password_hash FROM users WHERE username = ?",
    )
    .get(username) as
    | { id: string; username: string; password_hash: string }
    | undefined;

  if (!row) return null;
  if (!verifyPassword(password, row.password_hash)) return null;

  return { id: row.id, username: row.username };
}

export function createSession(userId: string): string {
  const db = getDb();
  const sessionId = randomUUID();
  db.prepare(
    "INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)",
  ).run(sessionId, userId, Date.now());
  return sessionId;
}

export function getUserBySession(sessionId: string | undefined): User | null {
  if (!sessionId) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id as id, u.username as username
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
    )
    .get(sessionId) as { id: string; username: string } | undefined;

  return row ?? null;
}

export function deleteSession(sessionId: string | undefined): void {
  if (!sessionId) return;
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}
