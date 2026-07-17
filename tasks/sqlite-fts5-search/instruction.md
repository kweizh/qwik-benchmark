# Full-Text Document Search with Qwik City and SQLite FTS5

## Background
You are building a server-rendered full-text search page with the Qwik City meta-framework. The search must run entirely locally against a **SQLite FTS5 virtual table** accessed through the `better-sqlite3` driver. Everything runs inside the container with no external services, APIs, or network access.

## Requirements
- Create a Qwik City application whose home route (`/`) is a full-text search page.
- Persist a document corpus in a local SQLite database and index it with an **FTS5 virtual table** so it can be searched with the `MATCH` operator.
- Seed the database with exactly these 8 documents (each has a `title` and a `body`):
  1. `Introduction to SQLite` | `SQLite is a lightweight embedded database engine used in many applications.`
  2. `Full Text Search with FTS5` | `The FTS5 extension enables fast full text search over documents using an inverted index.`
  3. `Getting Started with Qwik` | `Qwik is a resumable web framework that delivers instant loading web applications.`
  4. `Reactive State in Qwik` | `Use signals and stores to manage reactive state inside Qwik components.`
  5. `Building REST APIs` | `Design clean REST endpoints to serve JSON data to client applications.`
  6. `Database Indexing Basics` | `Indexes speed up query performance in relational databases like SQLite and Postgres.`
  7. `Server Side Rendering` | `Server side rendering improves performance and search engine visibility for web applications.`
  8. `Web Performance Tips` | `Reduce JavaScript to improve web performance and loading speed for users.`
- The search term is read from the URL query parameter `q`. When `q` is present and non-empty, run an FTS5 `MATCH` query on the server and render the ranked results.
- Results must be ranked by relevance (best match first) using FTS5's BM25 ranking, and each result must display a 1-based rank position, the document title, and a body snippet in which the matched term(s) are wrapped in `<mark>` HTML tags (use FTS5 `highlight()` or `snippet()`).
- Show the total number of matches, handle the no-results state, and handle the empty-query state.
- The search box must be debounced on the client and update the `q` URL query parameter as the user types.

## Implementation Hints
- Query parameters are available inside a `routeLoader$` via the `RequestEvent` API (e.g. `requestEvent.query`). Keep all `better-sqlite3` and `node:` imports strictly inside server-only boundaries (`routeLoader$`) so they never leak into the client bundle.
- Create the FTS5 table with `CREATE VIRTUAL TABLE ... USING fts5(title, body)` and query it with `... WHERE <table> MATCH ? ORDER BY rank`. `rank`/`bm25()` returns lower values for better matches.
- To render highlighted snippet HTML produced by FTS5 inside JSX, you will need to render raw HTML (e.g. `dangerouslySetInnerHTML`).
- The FTS5 tokenizer is case-insensitive, so a query like `qwik` matches the text `Qwik`.
- Ensure the database is seeded before the app serves requests (an auto-seed on startup or a separate seed step are both fine), and make seeding idempotent so restarts do not duplicate rows.
- Rendered output requirements (checked by the tests):
  - Display the total match count as visible text of the form `<count> results` (always use the word `results`, e.g. `2 results`).
  - When `q` is non-empty but there are no matches, render visible text containing `No results found`.
  - When `q` is missing or empty, do not run a search and render visible text containing `Enter a search term`.
  - Each matching result's snippet must contain at least one `<mark>...</mark>` element around the matched term.
- Project path: /home/user/qwik-fts-search
- The app must be served over SSR (so the route loader executes on the server) and listen on all interfaces on port 3000.
- Start command: `npm run dev -- --port 3000 --host 0.0.0.0`
- Search page route: GET `http://localhost:3000/?q=<term>` returns an HTML page containing the rendered search results as described above.

