import { DatabaseSync } from "node:sqlite";

const dbPath = "/home/user/qwik-app/database.sqlite";

let dbInstance: DatabaseSync | null = null;

export interface Comment {
  id: number;
  postId: string;
  parentId: number | null;
  text: string;
  author: string;
  createdAt: string;
}

export interface CommentNode extends Comment {
  replies: CommentNode[];
}

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(dbPath);
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

const parseDateToISO = (dateStr: string) => {
  if (!dateStr.includes("Z") && !dateStr.includes("GMT") && !dateStr.includes("+") && !dateStr.includes("-")) {
    return new Date(dateStr + " UTC").toISOString();
  }
  return new Date(dateStr).toISOString();
};

export function getCommentsTree(postId: string): CommentNode[] {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT id, postId, parentId, text, author, createdAt FROM Comment WHERE postId = ? ORDER BY createdAt ASC"
  );
  const rows = stmt.all(postId) as any[];

  const nodesMap = new Map<number, CommentNode>();
  const rootComments: CommentNode[] = [];

  for (const row of rows) {
    const node: CommentNode = {
      id: row.id,
      postId: row.postId,
      parentId: row.parentId,
      text: row.text,
      author: row.author,
      createdAt: parseDateToISO(row.createdAt),
      replies: [],
    };
    nodesMap.set(node.id, node);
  }

  for (const node of nodesMap.values()) {
    if (node.parentId === null) {
      rootComments.push(node);
    } else {
      const parentNode = nodesMap.get(node.parentId);
      if (parentNode) {
        parentNode.replies.push(node);
      }
    }
  }

  return rootComments;
}

export function commentExists(commentId: number, postId: string): boolean {
  const db = getDb();
  const stmt = db.prepare("SELECT 1 FROM Comment WHERE id = ? AND postId = ?");
  const row = stmt.get(commentId, postId);
  return !!row;
}

export function addComment(
  postId: string,
  parentId: number | null,
  text: string,
  author: string
): Comment {
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO Comment (postId, parentId, text, author) VALUES (?, ?, ?, ?)"
  );
  const info = stmt.run(postId, parentId, text, author);

  const selectStmt = db.prepare(
    "SELECT id, postId, parentId, text, author, createdAt FROM Comment WHERE id = ?"
  );
  const row = selectStmt.get(info.lastInsertRowid) as any;

  return {
    id: row.id,
    postId: row.postId,
    parentId: row.parentId,
    text: row.text,
    author: row.author,
    createdAt: parseDateToISO(row.createdAt),
  };
}
