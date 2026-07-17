import Database from "better-sqlite3";
import path from "node:path";

export interface CommentRow {
  id: number;
  parent_id: number | null;
  author: string;
  body: string;
  created_at: string;
}

export interface CommentNode extends CommentRow {
  children: CommentNode[];
  replyCount: number;
}

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  const dbPath = path.resolve(process.cwd(), "comments.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER NULL REFERENCES comments(id),
      author TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const row = db.prepare("SELECT COUNT(*) as count FROM comments").get() as {
    count: number;
  };

  if (row.count === 0) {
    seed(db);
  }

  return db;
}

function seed(database: Database.Database) {
  const insert = database.prepare(
    "INSERT INTO comments (parent_id, author, body) VALUES (?, ?, ?)",
  );

  const insertMany = database.transaction(() => {
    const aliceId = insert.run(null, "alice", "Welcome to the thread")
      .lastInsertRowid as number;
    const bobId = insert.run(aliceId, "bob", "Thanks alice!")
      .lastInsertRowid as number;
    insert.run(bobId, "carol", "Agreed, great start");
    insert.run(null, "dave", "Separate top-level thought");
  });

  insertMany();
}

export function getAllComments(): CommentRow[] {
  const database = getDb();
  return database
    .prepare("SELECT * FROM comments ORDER BY id ASC")
    .all() as CommentRow[];
}

export function addComment(
  parentId: number | null,
  author: string,
  body: string,
): CommentRow {
  const database = getDb();
  const result = database
    .prepare(
      "INSERT INTO comments (parent_id, author, body) VALUES (?, ?, ?)",
    )
    .run(parentId, author, body);

  return database
    .prepare("SELECT * FROM comments WHERE id = ?")
    .get(result.lastInsertRowid) as CommentRow;
}

/**
 * Builds a nested tree from the flat list of comment rows, and computes
 * the total descendant reply count for every comment.
 */
export function buildCommentTree(rows: CommentRow[]): CommentNode[] {
  const nodesById = new Map<number, CommentNode>();

  for (const row of rows) {
    nodesById.set(row.id, { ...row, children: [], replyCount: 0 });
  }

  const roots: CommentNode[] = [];

  for (const row of rows) {
    const node = nodesById.get(row.id)!;
    if (row.parent_id != null && nodesById.has(row.parent_id)) {
      nodesById.get(row.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Compute total descendant counts (post-order).
  function countDescendants(node: CommentNode): number {
    let total = 0;
    for (const child of node.children) {
      total += 1 + countDescendants(child);
    }
    node.replyCount = total;
    return total;
  }

  for (const root of roots) {
    countDescendants(root);
  }

  return roots;
}
