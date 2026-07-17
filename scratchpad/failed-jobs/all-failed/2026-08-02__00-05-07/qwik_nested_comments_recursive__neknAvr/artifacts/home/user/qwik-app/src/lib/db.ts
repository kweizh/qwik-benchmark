import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve the database file to <project-root>/database.sqlite regardless of
// the current working directory the dev/build process was started from.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "..", "..", "database.sqlite");

export interface CommentRow {
  id: number;
  postId: string;
  parentId: number | null;
  text: string;
  author: string;
  createdAt: string;
}

export interface CommentNode extends CommentRow {
  replies: CommentNode[];
}

let dbInstance: DatabaseSync | undefined;

/**
 * SQLite's CURRENT_TIMESTAMP produces `YYYY-MM-DD HH:MM:SS` (UTC, space
 * separated, no timezone suffix). Normalize it to a proper ISO 8601 string
 * (e.g. `YYYY-MM-DDTHH:MM:SS.000Z`) for API responses.
 */
function toIso(sqliteTimestamp: string): string {
  if (sqliteTimestamp.includes("T")) {
    // Already ISO-ish; make sure it round-trips through Date for consistency.
    const d = new Date(sqliteTimestamp);
    return Number.isNaN(d.getTime()) ? sqliteTimestamp : d.toISOString();
  }
  const d = new Date(sqliteTimestamp.replace(" ", "T") + "Z");
  return Number.isNaN(d.getTime()) ? sqliteTimestamp : d.toISOString();
}

function normalizeRow(row: CommentRow): CommentRow {
  return { ...row, createdAt: toIso(row.createdAt) };
}

function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec("PRAGMA foreign_keys = ON;");
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS Comment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        postId TEXT NOT NULL,
        parentId INTEGER,
        text TEXT NOT NULL,
        author TEXT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parentId) REFERENCES Comment(id) ON DELETE CASCADE
      );
    `);
  }
  return dbInstance;
}

/** Fetch a single comment by its id, or undefined if it doesn't exist. */
export function getCommentById(id: number): CommentRow | undefined {
  const database = getDb();
  const row = database
    .prepare("SELECT id, postId, parentId, text, author, createdAt FROM Comment WHERE id = ?")
    .get(id) as CommentRow | undefined;
  return row ? normalizeRow(row) : undefined;
}

/** Insert a new comment (or reply, when parentId is provided) and return it. */
export function insertComment(
  postId: string,
  parentId: number | null,
  text: string,
  author: string,
): CommentRow {
  const database = getDb();
  const stmt = database.prepare(
    "INSERT INTO Comment (postId, parentId, text, author) VALUES (?, ?, ?, ?)",
  );
  const info = stmt.run(postId, parentId, text, author);

  const created = database
    .prepare("SELECT id, postId, parentId, text, author, createdAt FROM Comment WHERE id = ?")
    .get(info.lastInsertRowid as number) as CommentRow;

  return normalizeRow(created);
}

/**
 * Fetch every comment for a post and assemble it into a nested tree of
 * top-level comments (parentId === null), each recursively containing its
 * `replies`. Everything is sorted chronologically (ascending) by createdAt.
 */
export function getCommentTree(postId: string): CommentNode[] {
  const database = getDb();
  const rows = database
    .prepare(
      "SELECT id, postId, parentId, text, author, createdAt FROM Comment WHERE postId = ? ORDER BY datetime(createdAt) ASC, id ASC",
    )
    .all(postId) as CommentRow[];

  const nodeMap = new Map<number, CommentNode>();
  for (const rawRow of rows) {
    const row = normalizeRow(rawRow);
    nodeMap.set(row.id, { ...row, replies: [] });
  }

  const roots: CommentNode[] = [];
  for (const row of rows) {
    const node = nodeMap.get(row.id)!;
    if (row.parentId === null || row.parentId === undefined) {
      roots.push(node);
    } else {
      const parent = nodeMap.get(row.parentId);
      if (parent) {
        parent.replies.push(node);
      } else {
        // Orphaned comment (shouldn't happen thanks to FK constraints), treat as root.
        roots.push(node);
      }
    }
  }

  return roots;
}
