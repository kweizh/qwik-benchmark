import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.resolve("/home/user/qwik-app/database.sqlite");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS Comment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      postId TEXT NOT NULL,
      parentId INTEGER,
      text TEXT NOT NULL,
      author TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parentId) REFERENCES Comment(id) ON DELETE CASCADE
    )
  `);
}

export interface CommentRow {
  id: number;
  postId: string;
  parentId: number | null;
  text: string;
  author: string;
  createdAt: string;
}

export interface CommentTree extends CommentRow {
  replies: CommentTree[];
}

export function getCommentsForPost(postId: string): CommentTree[] {
  const database = getDb();

  const rows = database
    .prepare(
      `SELECT id, postId, parentId, text, author, createdAt
       FROM Comment
       WHERE postId = ?
       ORDER BY createdAt ASC`
    )
    .all(postId) as CommentRow[];

  return buildTree(rows, null);
}

function buildTree(rows: CommentRow[], parentId: number | null): CommentTree[] {
  return rows
    .filter((row) => row.parentId === parentId)
    .map((row) => ({
      ...row,
      replies: buildTree(rows, row.id),
    }));
}

export function createComment(
  postId: string,
  parentId: number | null,
  text: string,
  author: string
): CommentRow {
  const database = getDb();

  // Validate parent exists if parentId is provided
  if (parentId !== null && parentId !== undefined) {
    const parent = database
      .prepare("SELECT id FROM Comment WHERE id = ?")
      .get(parentId) as { id: number } | undefined;

    if (!parent) {
      throw new ParentNotFoundError(
        `Parent comment with id ${parentId} not found`
      );
    }
  }

  const stmt = database.prepare(
    `INSERT INTO Comment (postId, parentId, text, author)
     VALUES (?, ?, ?, ?)`
  );

  const result = stmt.run(postId, parentId ?? null, text, author);

  return database
    .prepare("SELECT * FROM Comment WHERE id = ?")
    .get(result.lastInsertRowid) as CommentRow;
}

export class ParentNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParentNotFoundError";
  }
}
