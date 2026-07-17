import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';

const DB_PATH = '/home/user/qwik-app/db.sqlite';

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  // Ensure directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(DB_PATH);

  // Check if articles_fts table exists
  const tableCheck = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='articles_fts'
  `).get() as { name: string } | undefined;

  if (!tableCheck) {
    db.exec('CREATE VIRTUAL TABLE articles_fts USING fts5(title, content);');
  }

  // Check if table is empty
  const countCheck = db.prepare('SELECT COUNT(*) AS count FROM articles_fts').get() as { count: number } | undefined;

  if (!countCheck || countCheck.count === 0) {
    const insert = db.prepare('INSERT INTO articles_fts (title, content) VALUES (?, ?)');
    
    // Article 1
    insert.run(
      'Introduction to Qwik',
      'Qwik is a new kind of web framework that can deliver instant loading web applications at any scale. It achieves this through resumability, which completely eliminates eager hydration.'
    );

    // Article 2
    insert.run(
      'Understanding Resumability',
      'Resumability is the core innovation of Qwik. Unlike traditional hydration which downloads and executes all JavaScript on startup, Qwik serializes the application state and resumes execution instantly on user interaction.'
    );

    // Article 3
    insert.run(
      'SQLite FTS5 Full-Text Search',
      'SQLite\'s FTS5 extension allows users to perform full-text search on virtual tables. It supports advanced queries, prefix matching, and generating highlighted snippets using the snippet function.'
    );
  }

  dbInstance = db;
  return db;
}
