import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbDir = '/home/user/qwik-app/prisma';
const dbPath = path.join(dbDir, 'dev.db');

// Ensure directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS User (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL
  );
`);

// Check if empty and seed
const countResult = db.prepare('SELECT COUNT(*) as count FROM User').get() as { count: number };
if (countResult.count === 0) {
  const insert = db.prepare('INSERT INTO User (name, email, role) VALUES (?, ?, ?)');
  insert.run('Admin User', 'admin@example.com', 'ADMIN');
  insert.run('Regular User', 'user@example.com', 'USER');
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export function getUserByEmail(email: string): User | null {
  const user = db.prepare('SELECT * FROM User WHERE email = ?').get(email) as User | undefined;
  return user || null;
}

export function getAllUsers(): User[] {
  return db.prepare('SELECT * FROM User').all() as User[];
}

export function updateUserRole(email: string, role: string): boolean {
  const result = db.prepare('UPDATE User SET role = ? WHERE email = ?').run(role, email);
  return result.changes > 0;
}

export default db;
