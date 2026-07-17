import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export interface Post {
  id: number;
  title: string;
  body: string;
}

export interface PageResult {
  posts: Post[];
  hasMore: boolean;
}

export const PAGE_SIZE = 10;
export const TOTAL_POSTS = 47;

let dbInstance: Database.Database | null = null;

function getDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dataDir = path.join(process.cwd(), ".data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, "feed.sqlite3");

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL
    );
  `);

  const { count } = db
    .prepare("SELECT COUNT(*) as count FROM posts")
    .get() as { count: number };

  if (count === 0) {
    const insert = db.prepare(
      "INSERT INTO posts (id, title, body) VALUES (@id, @title, @body)",
    );
    const insertMany = db.transaction((posts: Post[]) => {
      for (const post of posts) {
        insert.run(post);
      }
    });

    const posts: Post[] = Array.from({ length: TOTAL_POSTS }, (_, i) => {
      const n = i + 1;
      return {
        id: n,
        title: `Post #${n}`,
        body: `This is the body of post number ${n}. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
      };
    });

    insertMany(posts);
  }

  dbInstance = db;
  return dbInstance;
}

/**
 * Returns a page of posts with id strictly greater than `cursor`,
 * ordered by ascending id, along with whether more posts remain
 * after this page.
 */
export function getFeedPage(cursor: number): PageResult {
  const db = getDb();

  const rows = db
    .prepare(
      "SELECT id, title, body FROM posts WHERE id > ? ORDER BY id ASC LIMIT ?",
    )
    .all(cursor, PAGE_SIZE + 1) as Post[];

  const hasMore = rows.length > PAGE_SIZE;
  const posts = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  return { posts, hasMore };
}
