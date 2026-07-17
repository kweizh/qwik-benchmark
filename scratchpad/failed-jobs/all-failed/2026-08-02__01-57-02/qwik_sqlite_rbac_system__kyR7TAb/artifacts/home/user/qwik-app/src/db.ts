import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const dbPath = '/home/user/qwik-app/prisma/dev.db';

// Ensure directory exists
const dir = dirname(dbPath);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);

// Create table User
db.exec(`
  CREATE TABLE IF NOT EXISTS User (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL
  );
`);

// Seed database if empty
const countStmt = db.prepare('SELECT COUNT(*) as count FROM User');
const { count } = countStmt.get() as { count: number };

if (count === 0) {
  const insertStmt = db.prepare('INSERT INTO User (name, email, role) VALUES (?, ?, ?)');
  insertStmt.run('Admin User', 'admin@example.com', 'ADMIN');
  insertStmt.run('Regular User', 'user@example.com', 'USER');
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export function getUserByEmail(email: string): User | null {
  const stmt = db.prepare('SELECT id, name, email, role FROM User WHERE email = ?');
  const user = stmt.get(email);
  return (user as User) || null;
}

export function getAllUsers(): User[] {
  const stmt = db.prepare('SELECT id, name, email, role FROM User');
  return stmt.all() as User[];
}

export function updateUserRole(email: string, role: string): boolean {
  const stmt = db.prepare('UPDATE User SET role = ? WHERE email = ?');
  const result = stmt.run(role, email);
  return result.changes > 0;
}

export default db;
