import Database from "better-sqlite3";
import { resolve } from "node:path";

export interface CommentRow {
  id: number;
  parent_id: number | null;
  author: string;
  body: string;
  created_at: string;
}

const DB_PATH = resolve(process.cwd(), "comments.db");

let dbInstance: Database.Database | null = null;

function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma("journal_mode = WAL");
    init(dbInstance);
  }
  return dbInstance;
}

function init(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id  INTEGER,
      author     TEXT    NOT NULL,
      body       TEXT    NOT NULL,
      created_at TEXT    NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
    );
  `);

  const count = db.prepare(`SELECT COUNT(*) AS c FROM comments`).get() as { c: number };
  if (count.c === 0) {
    seed(db);
  }
}

function seed(db: Database.Database) {
  const now = () => new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO comments (parent_id, author, body, created_at) VALUES (?, ?, ?, ?)`
  );
  const insertReturn = db.prepare(
    `INSERT INTO comments (parent_id, author, body, created_at) VALUES (?, ?, ?, ?) RETURNING id`
  );

  // alice (top-level)
  const alice = insertReturn.get(null, "alice", "Welcome to the thread", now()) as { id: number };
  // bob (reply to alice)
  const bob = insertReturn.get(alice.id, "bob", "Thanks alice!", now()) as { id: number };
  // carol (reply to bob)
  insert.run(bob.id, "carol", "Agreed, great start", now());
  // dave (top-level)
  insert.run(null, "dave", "Separate top-level thought", now());
}

export function getAllComments(): CommentRow[] {
  const db = getDb();
  return db.prepare(`SELECT id, parent_id, author, body, created_at FROM comments ORDER BY id ASC`).all() as CommentRow[];
}

export function addComment(parentId: number | null, author: string, body: string): CommentRow {
  const db = getDb();
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO comments (parent_id, author, body, created_at) VALUES (?, ?, ?, ?) RETURNING id, parent_id, author, body, created_at`
    )
    .get(parentId, author, body, now) as CommentRow;
  return info;
}