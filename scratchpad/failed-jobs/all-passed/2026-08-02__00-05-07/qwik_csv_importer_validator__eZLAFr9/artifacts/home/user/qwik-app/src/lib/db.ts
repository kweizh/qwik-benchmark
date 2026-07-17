import { DatabaseSync } from "node:sqlite";

const DB_PATH = "/home/user/qwik-app/database.sqlite";

export interface UserRow {
  id: number;
  name: string;
  email: string;
  age: number;
}

let dbInstance: DatabaseSync | undefined;

/**
 * Returns a singleton SQLite database connection, ensuring the `users`
 * table exists before returning.
 */
export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        age INTEGER NOT NULL
      )
    `);
  }
  return dbInstance;
}

export interface ValidUserInput {
  name: string;
  email: string;
  age: number;
}

/**
 * Inserts all given users atomically. If any insert fails, the whole
 * transaction is rolled back and no rows are persisted.
 */
export function insertUsersAtomically(users: ValidUserInput[]): number {
  const db = getDb();
  const insertStmt = db.prepare(
    "INSERT INTO users (name, email, age) VALUES (?, ?, ?)",
  );

  db.exec("BEGIN");
  try {
    for (const user of users) {
      insertStmt.run(user.name, user.email, user.age);
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return users.length;
}

export function getAllUsers(): UserRow[] {
  const db = getDb();
  const rows = db.prepare("SELECT id, name, email, age FROM users ORDER BY id ASC").all();
  return rows as unknown as UserRow[];
}
