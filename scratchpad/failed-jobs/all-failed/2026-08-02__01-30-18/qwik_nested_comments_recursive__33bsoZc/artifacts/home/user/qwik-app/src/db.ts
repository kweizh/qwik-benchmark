import Database from "better-sqlite3";

const dbPath = "/home/user/qwik-app/database.sqlite";

export const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Create Comment table if it does not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS Comment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    postId TEXT NOT NULL,
    parentId INTEGER,
    text TEXT NOT NULL,
    author TEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(parentId) REFERENCES Comment(id) ON DELETE CASCADE
  )
`);

export interface CommentRow {
  id: number;
  postId: string;
  parentId: number | null;
  text: string;
  author: string;
  createdAt: string;
}

export interface CommentWithReplies {
  id: number;
  postId: string;
  parentId: number | null;
  text: string;
  author: string;
  createdAt: string;
  replies: CommentWithReplies[];
}

export function getCommentsForPost(postId: string): CommentWithReplies[] {
  const rows = db.prepare(`
    SELECT id, postId, parentId, text, author, createdAt
    FROM Comment
    WHERE postId = ?
    ORDER BY createdAt ASC
  `).all(postId) as CommentRow[];

  return buildCommentTree(rows);
}

export function buildCommentTree(rows: CommentRow[]): CommentWithReplies[] {
  const map = new Map<number, CommentWithReplies>();
  const roots: CommentWithReplies[] = [];

  for (const row of rows) {
    const isoDate = new Date(row.createdAt.replace(" ", "T") + "Z").toISOString();
    const comment: CommentWithReplies = {
      id: row.id,
      postId: row.postId,
      parentId: row.parentId,
      text: row.text,
      author: row.author,
      createdAt: isoDate,
      replies: [],
    };
    map.set(comment.id, comment);
  }

  for (const row of rows) {
    const comment = map.get(row.id)!;
    if (comment.parentId === null) {
      roots.push(comment);
    } else {
      const parent = map.get(comment.parentId);
      if (parent) {
        parent.replies.push(comment);
      } else {
        roots.push(comment);
      }
    }
  }

  return roots;
}

export function insertComment(
  postId: string,
  parentId: number | null,
  text: string,
  author: string
): CommentRow {
  if (parentId !== null) {
    const parent = db.prepare("SELECT id, postId FROM Comment WHERE id = ?").get(parentId) as { id: number; postId: string } | undefined;
    if (!parent) {
      throw new Error("PARENT_NOT_FOUND");
    }
    if (parent.postId !== postId) {
      throw new Error("PARENT_POST_MISMATCH");
    }
  }

  const stmt = db.prepare(`
    INSERT INTO Comment (postId, parentId, text, author)
    VALUES (?, ?, ?, ?)
  `);
  const info = stmt.run(postId, parentId, text, author);
  const insertId = info.lastInsertRowid;

  const newComment = db.prepare("SELECT * FROM Comment WHERE id = ?").get(insertId) as CommentRow;
  
  // Format the createdAt for the returned comment
  newComment.createdAt = new Date(newComment.createdAt.replace(" ", "T") + "Z").toISOString();
  
  return newComment;
}
