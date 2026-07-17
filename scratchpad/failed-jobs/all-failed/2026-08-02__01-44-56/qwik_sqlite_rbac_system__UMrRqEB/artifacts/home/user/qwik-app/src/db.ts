import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = '/home/user/qwik-app/prisma/dev.db';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

let dbInstance: DatabaseSync | null = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(DB_PATH);

  // Create table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS User (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL
    );
  `);

  // Check if empty and seed
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM User');
  const result = countStmt.get() as { count: number };
  
  if (result.count === 0) {
    const insertStmt = db.prepare('INSERT INTO User (name, email, role) VALUES (?, ?, ?)');
    insertStmt.run('Admin User', 'admin@example.com', 'ADMIN');
    insertStmt.run('Regular User', 'user@example.com', 'USER');
  }

  dbInstance = db;
  return db;
}

export function getUserByEmail(email: string): User | null {
  const db = getDb();
  const stmt = db.prepare('SELECT id, name, email, role FROM User WHERE email = ?');
  const user = stmt.get(email) as User | undefined;
  return user || null;
}

export function getAllUsers(): User[] {
  const db = getDb();
  const stmt = db.prepare('SELECT id, name, email, role FROM User ORDER BY id ASC');
  return stmt.all() as User[];
}

export function updateUserRole(email: string, role: string): boolean {
  const db = getDb();
  const stmt = db.prepare('UPDATE User SET role = ? WHERE email = ?');
  const result = stmt.run(role, email) as { changes: number };
  return result.changes > 0;
}
