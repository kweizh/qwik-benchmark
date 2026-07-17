/**
 * Server-only SQLite data access layer.
 *
 * IMPORTANT: This module must only ever be imported/used from within
 * server-side boundaries (`routeLoader$`, `routeAction$`, or `server$`).
 * It relies on Node's built-in `node:sqlite` module and direct filesystem
 * access, neither of which are available (nor should be sent) to the client.
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const DB_PATH = "/home/user/qwik-app/prisma/dev.db";

export type Role = "ADMIN" | "USER";

export interface DbUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

// Keep a single DB connection alive for the lifetime of the server process.
let dbInstance: DatabaseSync | null = null;

function seedIfEmpty(database: DatabaseSync) {
  const { count } = database
    .prepare("SELECT COUNT(*) as count FROM User")
    .get() as { count: number };

  if (count === 0) {
    const insert = database.prepare(
      "INSERT INTO User (name, email, role) VALUES (?, ?, ?)",
    );
    insert.run("Admin User", "admin@example.com", "ADMIN");
    insert.run("Regular User", "user@example.com", "USER");
  }
}

function initDb(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  // Ensure the `prisma` directory exists before opening the DB file.
  mkdirSync(dirname(DB_PATH), { recursive: true });

  const database = new DatabaseSync(DB_PATH);

  database.exec(`
    CREATE TABLE IF NOT EXISTS User (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL
    );
  `);

  seedIfEmpty(database);

  dbInstance = database;
  return dbInstance;
}

/** Returns the singleton SQLite connection, initializing/seeding it on first use. */
export function getDb(): DatabaseSync {
  return initDb();
}

/** Looks up a user by email. Returns `undefined` if no match is found. */
export function getUserByEmail(email: string): DbUser | undefined {
  if (!email) return undefined;
  const database = getDb();
  const row = database
    .prepare("SELECT id, name, email, role FROM User WHERE email = ?")
    .get(email);
  return row as DbUser | undefined;
}

/** Returns every user in the database, ordered by id. */
export function getAllUsers(): DbUser[] {
  const database = getDb();
  return database
    .prepare("SELECT id, name, email, role FROM User ORDER BY id ASC")
    .all() as DbUser[];
}

/** Updates the role of the user matching `email`. Returns `true` if a row was changed. */
export function updateUserRole(email: string, role: string): boolean {
  const database = getDb();
  const result = database
    .prepare("UPDATE User SET role = ? WHERE email = ?")
    .run(role, email);
  return Number(result.changes) > 0;
}
