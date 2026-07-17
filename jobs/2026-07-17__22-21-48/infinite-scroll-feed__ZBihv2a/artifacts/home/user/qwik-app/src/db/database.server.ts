/**
 * Server-only SQLite database module.
 *
 * The `.server.ts` extension tells the Qwik optimizer that this module must
 * never be bundled into the client. All `better-sqlite3` imports and queries
 * live here, so no Node-only code can leak into the browser bundle.
 */
import Database from "better-sqlite3";
import { resolve } from "node:path";

export interface Post {
  id: number;
  title: string;
  body: string;
}

export interface PageResult {
  posts: Post[];
  hasMore: boolean;
}

/** Number of posts returned per page (cursor pagination). */
export const PAGE_SIZE = 10;

/** Total number of posts the feed is seeded with. */
export const TOTAL_POSTS = 47;

// The database file lives inside the project directory.
const DB_PATH = resolve(process.cwd(), "feed.db");

// Reuse a single connection across requests within the same module instance.
let dbInstance: Database.Database | null = null;

function getDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id    INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      body  TEXT NOT NULL
    )
  `);

  // Seed exactly 47 posts (Post #1 .. Post #47) when the table is empty.
  const row = db.prepare("SELECT COUNT(*) AS c FROM posts").get() as {
    c: number;
  };
  if (row.c === 0) {
    const insert = db.prepare(
      "INSERT INTO posts (id, title, body) VALUES (?, ?, ?)",
    );
    const seed = db.transaction(() => {
      for (let n = 1; n <= TOTAL_POSTS; n++) {
        insert.run(
          n,
          `Post #${n}`,
          `This is the body text for post number ${n}. It contains some descriptive content to give the feed item a bit of substance.`,
        );
      }
    });
    seed();
  }

  dbInstance = db;
  return db;
}

/** Returns the first page of posts (server-rendered via routeLoader$). */
export function getFirstPage(): PageResult {
  const db = getDb();
  const posts = db
    .prepare("SELECT * FROM posts ORDER BY id ASC LIMIT ?")
    .all(PAGE_SIZE) as Post[];

  const hasMore = posts.length < TOTAL_POSTS;
  return { posts, hasMore };
}

/** Returns the page of posts that come after the given cursor (last loaded id). */
export function getNextPage(cursor: number): PageResult {
  const db = getDb();
  const posts = db
    .prepare("SELECT * FROM posts WHERE id > ? ORDER BY id ASC LIMIT ?")
    .all(cursor, PAGE_SIZE) as Post[];

  const lastId = posts.length ? posts[posts.length - 1].id : cursor;
  const remaining = (
    db
      .prepare("SELECT COUNT(*) AS c FROM posts WHERE id > ?")
      .get(lastId) as { c: number }
  ).c;

  return { posts, hasMore: remaining > 0 };
}