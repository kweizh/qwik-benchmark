import Database from 'better-sqlite3';

const DB_PATH = '/home/user/qwik-app/db.sqlite';

// Initialize database
export const db = new Database(DB_PATH);

// Enable WAL mode for performance
db.pragma('journal_mode = WAL');

// Check if the table exists
const tableExists = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='articles_fts'"
).get();

if (!tableExists) {
  // Create virtual table with exact schema required:
  // CREATE VIRTUAL TABLE articles_fts USING fts5(title, content);
  db.prepare('CREATE VIRTUAL TABLE articles_fts USING fts5(title, content);').run();
}

// Check if the table is empty
const countRow = db.prepare('SELECT count(*) as count FROM articles_fts').get() as { count: number } | undefined;

if (!countRow || countRow.count === 0) {
  const insert = db.prepare('INSERT INTO articles_fts (title, content) VALUES (?, ?)');
  
  const seedArticles = [
    {
      title: 'Introduction to Qwik',
      content: 'Qwik is a new kind of web framework that can deliver instant loading web applications at any scale. It achieves this through resumability, which completely eliminates eager hydration.'
    },
    {
      title: 'Understanding Resumability',
      content: 'Resumability is the core innovation of Qwik. Unlike traditional hydration which downloads and executes all JavaScript on startup, Qwik serializes the application state and resumes execution instantly on user interaction.'
    },
    {
      title: 'SQLite FTS5 Full-Text Search',
      content: "SQLite's FTS5 extension allows users to perform full-text search on virtual tables. It supports advanced queries, prefix matching, and generating highlighted snippets using the snippet function."
    }
  ];

  // Use a transaction for seeding
  const insertMany = db.transaction((articles: typeof seedArticles) => {
    for (const article of articles) {
      insert.run(article.title, article.content);
    }
  });

  insertMany(seedArticles);
}
