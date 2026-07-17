/**
 * Server-only data access layer.
 *
 * This module must NEVER be imported by client-runnable code. It uses
 * `better-sqlite3` which depends on native Node bindings and must not end up
 * in the browser bundle. All imports from this file should originate from
 * `routeLoader$` or `server$()` callbacks so that the Qwik optimizer can
 * strip it out of the client graph.
 */
import Database from "better-sqlite3";
import { mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

export interface Post {
  id: number;
  title: string;
  body: string;
}

const PAGE_SIZE = 10;
const TOTAL_POSTS = 47;

const DB_PATH = resolve(process.cwd(), "data", "feed.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;

  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id   INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      body  TEXT NOT NULL
    );
  `);

  const countRow = db
    .prepare("SELECT COUNT(*) as c FROM posts")
    .get() as { c: number };

  if (countRow.c < TOTAL_POSTS) {
    const insert = db.prepare(
      "INSERT INTO posts (id, title, body) VALUES (?, ?, ?)",
    );
    const insertMany = db.transaction(() => {
      // Wipe existing rows so re-seeding always converges to exactly 47 posts.
      db.exec("DELETE FROM posts");
      for (let n = 1; n <= TOTAL_POSTS; n++) {
        insert.run(n, `Post #${n}`, `This is the body of post number ${n}.`);
      }
    });
    insertMany();
  }

  _db = db;
  return _db;
}

export interface FeedPage {
  posts: Post[];
  hasMore: boolean;
}

/**
 * Return the first page of the feed (no cursor) – used by `routeLoader$`
 * during the initial server render.
 */
export function getInitialFeed(): FeedPage {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, title, body FROM posts ORDER BY id ASC LIMIT ?",
    )
    .all(PAGE_SIZE) as Post[];

  const total = (db.prepare("SELECT COUNT(*) as c FROM posts").get() as {
    c: number;
  }).c;

  return {
    posts: rows,
    hasMore: rows.length < total,
  };
}

/**
 * Return the page that comes after `cursor` (the id of the last loaded post).
 * Used by the `server$()` RPC that powers infinite scroll on the client.
 */
export function getFeedAfter(cursor: number): FeedPage {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, title, body FROM posts WHERE id > ? ORDER BY id ASC LIMIT ?",
    )
    .all(cursor, PAGE_SIZE) as Post[];

  const total = (db.prepare("SELECT COUNT(*) as c FROM posts").get() as {
    c: number;
  }).c;
  const lastLoaded =
    rows.length > 0 ? rows[rows.length - 1].id : cursor;
  const hasMore = lastLoaded < total;

  return {
    posts: rows,
    hasMore,
  };
}
