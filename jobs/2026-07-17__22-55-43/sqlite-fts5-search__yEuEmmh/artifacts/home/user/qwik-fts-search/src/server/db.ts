/**
 * Server-only SQLite FTS5 data access module.
 *
 * IMPORTANT: This file imports `better-sqlite3` and Node.js built-ins.
 * It must only ever be imported from server-only boundaries (e.g. inside
 * a `routeLoader$` callback) so that these dependencies never end up in
 * the client bundle.
 */
import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

export interface SearchResult {
  rank: number;
  title: string;
  snippet: string;
}

const DB_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DB_DIR, "search.db");

const DOCUMENTS: Array<{ title: string; body: string }> = [
  {
    title: "Introduction to SQLite",
    body: "SQLite is a lightweight embedded database engine used in many applications.",
  },
  {
    title: "Full Text Search with FTS5",
    body: "The FTS5 extension enables fast full text search over documents using an inverted index.",
  },
  {
    title: "Getting Started with Qwik",
    body: "Qwik is a resumable web framework that delivers instant loading web applications.",
  },
  {
    title: "Reactive State in Qwik",
    body: "Use signals and stores to manage reactive state inside Qwik components.",
  },
  {
    title: "Building REST APIs",
    body: "Design clean REST endpoints to serve JSON data to client applications.",
  },
  {
    title: "Database Indexing Basics",
    body: "Indexes speed up query performance in relational databases like SQLite and Postgres.",
  },
  {
    title: "Server Side Rendering",
    body: "Server side rendering improves performance and search engine visibility for web applications.",
  },
  {
    title: "Web Performance Tips",
    body: "Reduce JavaScript to improve web performance and loading speed for users.",
  },
];

let dbInstance: Database.Database | null = null;

function seed(database: Database.Database): void {
  database.exec(
    `CREATE VIRTUAL TABLE IF NOT EXISTS documents USING fts5(title, body);`,
  );

  const { count } = database
    .prepare(`SELECT COUNT(*) as count FROM documents`)
    .get() as { count: number };

  if (count === 0) {
    const insert = database.prepare(
      `INSERT INTO documents (title, body) VALUES (?, ?)`,
    );
    const insertAll = database.transaction(
      (docs: typeof DOCUMENTS) => {
        for (const doc of docs) {
          insert.run(doc.title, doc.body);
        }
      },
    );
    insertAll(DOCUMENTS);
  }
}

/**
 * Returns a singleton, seeded `better-sqlite3` database handle.
 * Seeding is idempotent: it only inserts the corpus once (checked via row count).
 */
export function getDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true });
  }

  const database = new Database(DB_PATH);
  database.pragma("journal_mode = WAL");
  seed(database);

  dbInstance = database;
  return dbInstance;
}

/**
 * Builds a safe FTS5 MATCH query string from raw user input by quoting
 * every token as a phrase (with prefix matching), so punctuation and FTS5
 * operator characters in user input can never produce a syntax error.
 * Tokens are implicitly AND-ed together by FTS5.
 */
function toMatchQuery(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `"${term.replace(/"/g, '""')}"*`)
    .join(" ");
}

/**
 * Runs a ranked FTS5 full-text search over the `documents` virtual table.
 * Results are ordered by relevance (best match first) using FTS5's built-in
 * `rank` column (BM25 under the hood, lower = better, so ascending order).
 * The body snippet has matched terms wrapped in <mark> tags.
 */
export function searchDocuments(query: string): SearchResult[] {
  const database = getDb();
  const matchQuery = toMatchQuery(query);

  if (!matchQuery) {
    return [];
  }

  const rows = database
    .prepare(
      `SELECT
         title,
         snippet(documents, 1, '<mark>', '</mark>', '…', 12) as snippet
       FROM documents
       WHERE documents MATCH ?
       ORDER BY rank`,
    )
    .all(matchQuery) as Array<{ title: string; snippet: string }>;

  return rows.map((row, index) => ({
    rank: index + 1,
    title: row.title,
    snippet: row.snippet,
  }));
}
