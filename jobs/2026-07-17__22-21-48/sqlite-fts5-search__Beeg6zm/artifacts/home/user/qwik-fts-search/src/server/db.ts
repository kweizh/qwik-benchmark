/**
 * Server-only SQLite + FTS5 module.
 *
 * IMPORTANT: This file imports `better-sqlite3` and `node:*` built-ins, so it
 * must only ever be imported from server-only boundaries (e.g. `routeLoader$`).
 * Never import it from a component that can render on the client.
 */
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

export interface SearchResult {
  title: string;
  snippet: string;
}

export interface SearchResponse {
  total: number;
  results: SearchResult[];
}

const DATA_DIR = join(process.cwd(), "data");
const DB_PATH = join(DATA_DIR, "search.db");

// The 8 seed documents required by the task.
const SEED_DOCUMENTS: Array<{ title: string; body: string }> = [
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

let db: Database.Database | null = null;

/**
 * Eagerly create/open the database and seed it. Safe to call at server startup.
 * Seeding is idempotent, so repeated calls (e.g. dev HMR reloads) are harmless.
 */
export function initDatabase(): void {
  getDb();
}

function getDb(): Database.Database {
  if (db) return db;
  mkdirSync(DATA_DIR, { recursive: true });
  const connection = new Database(DB_PATH);
  connection.pragma("journal_mode = WAL");

  // Create the FTS5 virtual table (idempotent).
  connection.exec(
    "CREATE VIRTUAL TABLE IF NOT EXISTS documents USING fts5(title, body);",
  );

  // Idempotent seeding: ensure exactly the 8 seed documents are present.
  const countRow = connection
    .prepare("SELECT count(*) AS c FROM documents")
    .get() as { c: number };

  if (countRow.c !== SEED_DOCUMENTS.length) {
    const wipe = connection.prepare("DELETE FROM documents");
    const insert = connection.prepare(
      "INSERT INTO documents (title, body) VALUES (?, ?)",
    );
    const seed = connection.transaction(() => {
      wipe.run();
      for (const doc of SEED_DOCUMENTS) {
        insert.run(doc.title, doc.body);
      }
    });
    seed();
  }

  db = connection;
  return connection;
}

/**
 * Run an FTS5 MATCH query against the documents corpus, returning results
 * ranked by BM25 relevance (best match first) with highlighted snippets.
 */
export function searchDocuments(query: string): SearchResponse {
  const connection = getDb();

  // snippet(table, column-index, start-marker, end-marker, ellipsis, token-count)
  // column index 1 == the `body` column; column index 0 == the `title` column.
  // Matched terms are wrapped in <mark>.
  const stmt = connection.prepare(`
    SELECT
      documents.title AS title,
      snippet(documents, 1, '<mark>', '</mark>', '…', 12) AS body_snippet,
      highlight(documents, 0, '<mark>', '</mark>') AS title_highlight,
      bm25(documents) AS rank
    FROM documents
    WHERE documents MATCH ?
    ORDER BY rank
    LIMIT 50;
  `);

  let rows: Array<{
    title: string;
    body_snippet: string;
    title_highlight: string;
  }> = [];
  try {
    rows = stmt.all(query) as Array<{
      title: string;
      body_snippet: string;
      title_highlight: string;
    }>;
  } catch {
    // Invalid FTS5 query syntax (e.g. unbalanced quotes) -> no results.
    rows = [];
  }

  const results = rows.map((r) => {
    // Prefer a body snippet containing the highlighted match. If the match was
    // only in the title (e.g. "Database" matches the title "Database Indexing
    // Basics" but the body only has "databases"), fall back to the highlighted
    // title so every result's snippet contains a <mark> around the matched term.
    let snippet = r.body_snippet;
    if (!snippet.includes("<mark>")) {
      snippet = r.title_highlight;
    }
    return { title: r.title, snippet };
  });

  return {
    total: results.length,
    results,
  };
}