import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const dbDir = '/home/user/qwik-app/prisma';
const dbPath = path.join(dbDir, 'dev.db');

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize database schema
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
  const seedUsers = [
    { name: 'Admin User', email: 'admin@example.com', role: 'ADMIN' },
    { name: 'Regular User', email: 'user@example.com', role: 'USER' }
  ];

  const transaction = db.transaction((users) => {
    for (const user of users) {
      insertStmt.run(user.name, user.email, user.role);
    }
  });

  transaction(seedUsers);
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER' | string;
}

export { db };
