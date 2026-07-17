import Database from 'better-sqlite3';

let dbInstance: Database.Database | null = null;

export interface DbComment {
  id: number;
  postId: string;
  parentId: number | null;
  text: string;
  author: string;
  createdAt: string;
}

export interface CommentResponse {
  id: number;
  postId: string;
  parentId: number | null;
  text: string;
  author: string;
  createdAt: string;
  replies: CommentResponse[];
}

export function getDb() {
  if (!dbInstance) {
    const dbPath = '/home/user/qwik-app/database.sqlite';
    dbInstance = new Database(dbPath);
    dbInstance.pragma('foreign_keys = ON');
    
    // Create the Comment table if it does not exist
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS Comment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        postId TEXT NOT NULL,
        parentId INTEGER REFERENCES Comment(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        author TEXT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
  return dbInstance;
}

export function formatComment(row: DbComment): CommentResponse {
  let isoDate = row.createdAt;
  try {
    if (!row.createdAt.includes('T')) {
      isoDate = new Date(row.createdAt + ' UTC').toISOString();
    } else {
      isoDate = new Date(row.createdAt).toISOString();
    }
  } catch (e) {
    isoDate = new Date().toISOString();
  }
  return {
    id: row.id,
    postId: row.postId,
    parentId: row.parentId,
    text: row.text,
    author: row.author,
    createdAt: isoDate,
    replies: []
  };
}

export function buildCommentTree(comments: DbComment[]): CommentResponse[] {
  const commentMap = new Map<number, CommentResponse>();
  const topLevelComments: CommentResponse[] = [];

  for (const comment of comments) {
    commentMap.set(comment.id, formatComment(comment));
  }

  for (const comment of comments) {
    const formatted = commentMap.get(comment.id)!;
    if (comment.parentId === null) {
      topLevelComments.push(formatted);
    } else {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies.push(formatted);
      } else {
        topLevelComments.push(formatted);
      }
    }
  }

  return topLevelComments;
}
