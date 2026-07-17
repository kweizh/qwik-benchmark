import Database from 'better-sqlite3';
import { join } from 'path';

let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    const dbPath = join(process.cwd(), 'posts.db');
    db = new Database(dbPath);
    
    // Create the table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        body TEXT NOT NULL
      )
    `);
    
    // Check if we need to seed
    const countRow = db.prepare('SELECT COUNT(*) as count FROM posts').get() as { count: number };
    if (countRow.count === 0) {
      const insert = db.prepare('INSERT INTO posts (id, title, body) VALUES (?, ?, ?)');
      const insertMany = db.transaction(() => {
        for (let i = 1; i <= 47; i++) {
          insert.run(i, `Post #${i}`, `This is the body text for Post #${i}.`);
        }
      });
      insertMany();
    }
  }
  return db;
}

export interface Post {
  id: number;
  title: string;
  body: string;
}

export function getPostsPage(cursor: number | null, limit: number = 10): { posts: Post[]; hasMore: boolean } {
  const database = getDb();
  let posts: Post[];
  if (cursor === null) {
    // First page
    posts = database.prepare('SELECT * FROM posts ORDER BY id ASC LIMIT ?').all(limit) as Post[];
  } else {
    // Subsequent pages
    posts = database.prepare('SELECT * FROM posts WHERE id > ? ORDER BY id ASC LIMIT ?').all(cursor, limit) as Post[];
  }
  
  // Check if there are more posts
  let hasMore = false;
  if (posts.length > 0) {
    const lastId = posts[posts.length - 1].id;
    const nextRow = database.prepare('SELECT id FROM posts WHERE id > ? ORDER BY id ASC LIMIT 1').get(lastId);
    hasMore = !!nextRow;
  }
  
  return { posts, hasMore };
}
