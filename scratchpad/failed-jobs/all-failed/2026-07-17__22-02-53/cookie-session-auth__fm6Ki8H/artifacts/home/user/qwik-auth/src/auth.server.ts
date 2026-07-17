import crypto from "node:crypto";
import path from "node:path";
import Database from "better-sqlite3";

// Password Hashing & Verification
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const verifyHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(verifyHash, "hex")
  );
}

// Database Initialization
const dbPath = path.resolve(process.cwd(), "db.sqlite");
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
`);

// Seed alice if not exists
const checkUser = db.prepare("SELECT * FROM users WHERE username = ?");
const alice = checkUser.get("alice");
if (!alice) {
  const insertUser = db.prepare(
    "INSERT INTO users (username, password_hash) VALUES (?, ?)"
  );
  insertUser.run("alice", hashPassword("s3cret-pass"));
}

// Session Management
export function createSession(username: string): string {
  const sessionId = crypto.randomBytes(32).toString("hex");
  // Session expires in 24 hours
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  const insertSession = db.prepare(
    "INSERT INTO sessions (id, username, expires_at) VALUES (?, ?, ?)"
  );
  insertSession.run(sessionId, username, expiresAt);
  return sessionId;
}

export function getSession(sessionId: string): { username: string } | null {
  const selectSession = db.prepare(
    "SELECT username, expires_at FROM sessions WHERE id = ?"
  );
  const session = selectSession.get(sessionId) as
    | { username: string; expires_at: number }
    | undefined;
  if (!session) return null;
  if (Date.now() > session.expires_at) {
    // Delete expired session
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
    return null;
  }
  return { username: session.username };
}

export function deleteSession(sessionId: string): void {
  db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

export function getUserByUsername(username: string) {
  return db.prepare("SELECT * FROM users WHERE username = ?").get(username) as
    | { id: number; username: string; password_hash: string }
    | undefined;
}
