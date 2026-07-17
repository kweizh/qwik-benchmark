import Database from "better-sqlite3";
import path from "path";

const DB_PATH = "/home/user/qwik-app/db.sqlite";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  db.pragma("journal_mode = WAL");

  // Create the FTS5 virtual table if it doesn't exist
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(title, content);
  `);

  // Seed the database if empty
  const count = db.prepare("SELECT COUNT(*) as count FROM articles_fts").get() as {
    count: number;
  };

  if (count.count === 0) {
    const insert = db.prepare(
      "INSERT INTO articles_fts (title, content) VALUES (?, ?)",
    );

    insert.run(
      "Introduction to Qwik",
      "Qwik is a new kind of web framework that can deliver instant loading web applications at any scale. It achieves this through resumability, which completely eliminates eager hydration.",
    );

    insert.run(
      "Understanding Resumability",
      "Resumability is the core innovation of Qwik. Unlike traditional hydration which downloads and executes all JavaScript on startup, Qwik serializes the application state and resumes execution instantly on user interaction.",
    );

    insert.run(
      "SQLite FTS5 Full-Text Search",
      "SQLite's FTS5 extension allows users to perform full-text search on virtual tables. It supports advanced queries, prefix matching, and generating highlighted snippets using the snippet function.",
    );
  }

  return db;
}
