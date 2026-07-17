// Server-only database module. Never imported from client code.
// This file uses Node-only modules (`node:*`, `better-sqlite3`) so it must
// only be loaded inside server boundaries (e.g. `routeLoader$`).

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export interface SearchResultRow {
  rank: number;
  title: string;
  snippet: string;
  body: string;
}

export interface SearchPayload {
  query: string;
  results: SearchResultRow[];
  total: number;
}

export const DB_PATH = resolve(process.cwd(), "data", "app.db");

const SEED_DOCUMENTS: ReadonlyArray<{ title: string; body: string }> = [
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

let cachedDb: Database.Database | null = null;
let initialized = false;

function ensureSchema(db: Database.Database): void {
  db.exec(
    "CREATE VIRTUAL TABLE IF NOT EXISTS documents USING fts5(title, body)",
  );
}

function seedIfEmpty(db: Database.Database): void {
  const countRow = db
    .prepare("SELECT COUNT(*) AS c FROM documents")
    .get() as { c: number };
  if (countRow.c > 0) {
    return;
  }
  const insert = db.prepare(
    "INSERT INTO documents (title, body) VALUES (?, ?)",
  );
  const tx = db.transaction((rows: ReadonlyArray<{ title: string; body: string }>) => {
    for (const row of rows) {
      insert.run(row.title, row.body);
    }
  });
  tx(SEED_DOCUMENTS);
}

function initDatabase(db: Database.Database): void {
  ensureSchema(db);
  seedIfEmpty(db);
  initialized = true;
}

function getDb(): Database.Database {
  if (cachedDb && initialized) {
    return cachedDb;
  }
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  // Ensure FTS5 features used below (highlight, snippet, bm25) are available.
  db.exec("PRAGMA journal_mode = WAL");
  initDatabase(db);
  cachedDb = db;
  return db;
}

/**
 * Run a full-text search against the documents FTS5 table.
 * Returns ranked results with highlighted snippets and the total match count.
 *
 * `rawQuery` is the user-supplied query string from the URL. Each whitespace-
 * separated token is individually escaped and wrapped in double quotes so that
 * FTS5 treats it as a literal term. FTS5 implicit-AND's multiple quoted
 * tokens together, so "qwik database" matches documents containing both
 * terms. This also keeps FTS5 from interpreting user input as operators
 * (e.g. `*`, `AND`, `OR`, `NEAR`) which would otherwise raise errors.
 */
export function searchDocuments(rawQuery: string): SearchPayload {
  const query = rawQuery.trim();
  if (!query) {
    return { query: "", results: [], total: 0 };
  }

  const db = getDb();

  const tokens = query
    .split(/\s+/)
    .map((token) => token.replace(/"/g, '""'))
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    return { query, results: [], total: 0 };
  }

  const ftsQuery = tokens.map((t) => `"${t}"`).join(" ");

  // Use bm25() explicitly (rank is equivalent) and highlight() to wrap
  // matches in <mark>...</mark>. snippet() could be used as well, but
  // the highlight() function on the body column already produces a
  // snippet-like string with all matches tagged.
  const stmt = db.prepare<
    [string],
    {
      title: string;
      body: string;
      rank: number;
      snippet: string;
    }
  >(`
    SELECT
      title,
      body,
      bm25(documents) AS rank,
      highlight(documents, 1, '<mark>', '</mark>') AS snippet
    FROM documents
    WHERE documents MATCH ?
    ORDER BY rank
  `);

  const rows = stmt.all(ftsQuery) as Array<{
    title: string;
    body: string;
    rank: number;
    snippet: string;
  }>;

  const results: SearchResultRow[] = rows.map((row, index) => ({
    rank: index + 1,
    title: row.title,
    body: row.body,
    snippet: row.snippet,
  }));

  return {
    query,
    results,
    total: results.length,
  };
}

// Eagerly initialize the database so seeding happens before the first request.
getDb();
