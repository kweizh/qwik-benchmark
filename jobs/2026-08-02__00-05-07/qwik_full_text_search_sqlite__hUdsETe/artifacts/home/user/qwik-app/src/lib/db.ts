/**
 * Server-only SQLite (FTS5) database module.
 *
 * IMPORTANT: This module uses Node's built-in `node:sqlite` module and the
 * `node:fs` module. It must only ever be imported from server-only code
 * (Qwik City endpoint handlers such as `onGet` / `onPost` in `src/routes/**`).
 * Importing this file from a component that is bundled for the client would
 * break the client build, since these Node built-ins do not exist in the
 * browser.
 */
import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";

const DB_PATH = "/home/user/qwik-app/db.sqlite";

interface SeedArticle {
  title: string;
  content: string;
}

const SEED_ARTICLES: SeedArticle[] = [
  {
    title: "Introduction to Qwik",
    content:
      "Qwik is a new kind of web framework that can deliver instant loading web applications at any scale. It achieves this through resumability, which completely eliminates eager hydration.",
  },
  {
    title: "Understanding Resumability",
    content:
      "Resumability is the core innovation of Qwik. Unlike traditional hydration which downloads and executes all JavaScript on startup, Qwik serializes the application state and resumes execution instantly on user interaction.",
  },
  {
    title: "SQLite FTS5 Full-Text Search",
    content:
      "SQLite's FTS5 extension allows users to perform full-text search on virtual tables. It supports advanced queries, prefix matching, and generating highlighted snippets using the snippet function.",
  },
];

let dbInstance: DatabaseSync | undefined;

function tableExists(database: DatabaseSync): boolean {
  const row = database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'articles_fts'",
    )
    .get();
  return !!row;
}

function seedIfEmpty(database: DatabaseSync): void {
  const { count } = database
    .prepare("SELECT COUNT(*) as count FROM articles_fts")
    .get() as { count: number };

  if (count > 0) {
    return;
  }

  const insert = database.prepare(
    "INSERT INTO articles_fts (title, content) VALUES (?, ?)",
  );

  for (const article of SEED_ARTICLES) {
    insert.run(article.title, article.content);
  }
}

function initDb(): DatabaseSync {
  const dbFileExisted = existsSync(DB_PATH);
  const database = new DatabaseSync(DB_PATH);

  const hasTable = dbFileExisted && tableExists(database);

  if (!hasTable) {
    database.exec(
      "CREATE VIRTUAL TABLE articles_fts USING fts5(title, content);",
    );
  }

  seedIfEmpty(database);

  return database;
}

/**
 * Returns a singleton, initialized (and seeded, if necessary) database
 * connection. Safe to call from any server-only handler.
 */
export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = initDb();
  }
  return dbInstance;
}
