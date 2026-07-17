import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.resolve("/home/user/qwik-app/prisma/dev.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initializeDb(db);
  }
  return db;
}

function initializeDb(db: Database.Database): void {
  // Create the User table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS User (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL
    )
  `);

  // Seed the database if empty
  const count = db.prepare("SELECT COUNT(*) as count FROM User").get() as {
    count: number;
  };

  if (count.count === 0) {
    const insert = db.prepare(
      "INSERT INTO User (name, email, role) VALUES (?, ?, ?)",
    );
    insert.run("Admin User", "admin@example.com", "ADMIN");
    insert.run("Regular User", "user@example.com", "USER");
  }
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export function getUserByEmail(email: string): User | undefined {
  const database = getDb();
  return database
    .prepare("SELECT * FROM User WHERE email = ?")
    .get(email) as User | undefined;
}

export function getAllUsers(): User[] {
  const database = getDb();
  return database.prepare("SELECT * FROM User ORDER BY id ASC").all() as User[];
}

export function updateUserRole(email: string, role: string): boolean {
  const database = getDb();
  const result = database
    .prepare("UPDATE User SET role = ? WHERE email = ?")
    .run(role, email);
  return result.changes > 0;
}
