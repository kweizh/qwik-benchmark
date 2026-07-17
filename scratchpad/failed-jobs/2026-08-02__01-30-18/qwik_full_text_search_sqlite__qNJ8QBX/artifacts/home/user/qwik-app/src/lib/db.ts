import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = '/home/user/qwik-app/db.sqlite';

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);

// Check if the articles_fts table exists
const tableExists = db.prepare(`
  SELECT name FROM sqlite_master WHERE type='table' AND name='articles_fts'
`).get();

if (!tableExists) {
  // Create virtual table with exact schema
  db.exec(`CREATE VIRTUAL TABLE articles_fts USING fts5(title, content);`);
}

// Check if empty
const rowCount = db.prepare(`SELECT count(*) as count FROM articles_fts`).get() as { count: number };

if (rowCount.count === 0) {
  const insert = db.prepare(`INSERT INTO articles_fts (title, content) VALUES (?, ?)`);
  
  const articles = [
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
      content: 'SQLite\'s FTS5 extension allows users to perform full-text search on virtual tables. It supports advanced queries, prefix matching, and generating highlighted snippets using the snippet function.'
    }
  ];

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insert.run(item.title, item.content);
    }
  });

  insertMany(articles);
}
