import Database from "better-sqlite3";

export interface CommentRow {
  id: number;
  parent_id: number | null;
  author: string;
  body: string;
  created_at: string;
}

export interface CommentNode extends CommentRow {
  replies: CommentNode[];
  descendantCount: number;
}

let dbInstance: Database.Database | null = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = new Database("/home/user/qwik-comments/comments.db");

    // Enable foreign keys
    dbInstance.pragma("foreign_keys = ON");

    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_id INTEGER,
        author TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
      )
    `);

    // Check if empty, and seed if so
    const count = dbInstance
      .prepare("SELECT COUNT(*) as count FROM comments")
      .get() as { count: number };
    if (count.count === 0) {
      const insert = dbInstance.prepare(
        "INSERT INTO comments (parent_id, author, body, created_at) VALUES (?, ?, ?, ?)",
      );
      const now = new Date().toISOString();

      const res1 = insert.run(null, "alice", "Welcome to the thread", now);
      const aliceId = res1.lastInsertRowid;

      const res2 = insert.run(aliceId, "bob", "Thanks alice!", now);
      const bobId = res2.lastInsertRowid;

      insert.run(bobId, "carol", "Agreed, great start", now);
      insert.run(null, "dave", "Separate top-level thought", now);
    }
  }
  return dbInstance;
}

export function getAllComments(): CommentRow[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM comments ORDER BY id ASC")
    .all() as CommentRow[];
}

export function addComment(
  parentId: number | null,
  author: string,
  body: string,
): CommentRow {
  const db = getDb();
  const now = new Date().toISOString();
  const info = db
    .prepare(
      "INSERT INTO comments (parent_id, author, body, created_at) VALUES (?, ?, ?, ?)",
    )
    .run(parentId, author, body, now);

  return {
    id: info.lastInsertRowid as number,
    parent_id: parentId,
    author,
    body,
    created_at: now,
  };
}

export function buildTree(rows: CommentRow[]): CommentNode[] {
  const map = new Map<number, CommentNode>();
  const roots: CommentNode[] = [];

  // Create nodes
  for (const row of rows) {
    map.set(row.id, {
      ...row,
      replies: [],
      descendantCount: 0,
    });
  }

  // Build relationships
  for (const row of rows) {
    const node = map.get(row.id)!;
    if (row.parent_id === null) {
      roots.push(node);
    } else {
      const parent = map.get(row.parent_id);
      if (parent) {
        parent.replies.push(node);
      } else {
        // Fallback if parent not found
        roots.push(node);
      }
    }
  }

  // Calculate descendant counts
  function calculateDescendants(node: CommentNode): number {
    let count = 0;
    for (const reply of node.replies) {
      count += 1 + calculateDescendants(reply);
    }
    node.descendantCount = count;
    return count;
  }

  for (const root of roots) {
    calculateDescendants(root);
  }

  return roots;
}
