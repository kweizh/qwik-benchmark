import Database from "better-sqlite3";

const DB_PATH = "/home/user/qwik-app/db.sqlite";

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = new Database(DB_PATH);

  // Create FTS5 virtual table using exact schema
  dbInstance.exec(
    "CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(title, content);"
  );

  // Check if database is empty (i.e. has 0 rows in articles_fts)
  const row = dbInstance
    .prepare("SELECT COUNT(*) as count FROM articles_fts")
    .get() as { count: number };

  if (row.count === 0) {
    const seedData = [
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

    const insert = dbInstance.prepare(
      "INSERT INTO articles_fts (title, content) VALUES (?, ?)"
    );
    const insertTransaction = dbInstance.transaction((articles) => {
      for (const article of articles) {
        insert.run(article.title, article.content);
      }
    });

    insertTransaction(seedData);
  }

  return dbInstance;
}
