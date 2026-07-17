# Qwik City Full-Text Search with SQLite FTS5

## Background
SQLite's FTS5 extension provides powerful, high-performance full-text search capabilities directly within a serverless database. In a full-stack meta-framework like Qwik, server-side code (such as database queries) can be safely executed within server-only handlers (like Qwik City API endpoints) without leaking server-only modules or database credentials into client-side browser bundles. This task requires building a self-contained, high-performance article search backend using Qwik City and SQLite FTS5.

## Requirements
1. **Database Initialization & Seeding**:
   - Initialize a local SQLite database at `/home/user/qwik-app/db.sqlite`.
   - Create an FTS5 virtual table named `articles_fts` with the columns `title` and `content` using the following exact schema:
     ```sql
     CREATE VIRTUAL TABLE articles_fts USING fts5(title, content);
     ```
   - On application startup, if the database is empty or does not exist, initialize and seed it with exactly the following three articles:
     - **Article 1**:
       - Title: `Introduction to Qwik`
       - Content: `Qwik is a new kind of web framework that can deliver instant loading web applications at any scale. It achieves this through resumability, which completely eliminates eager hydration.`
     - **Article 2**:
       - Title: `Understanding Resumability`
       - Content: `Resumability is the core innovation of Qwik. Unlike traditional hydration which downloads and executes all JavaScript on startup, Qwik serializes the application state and resumes execution instantly on user interaction.`
     - **Article 3**:
       - Title: `SQLite FTS5 Full-Text Search`
       - Content: `SQLite's FTS5 extension allows users to perform full-text search on virtual tables. It supports advanced queries, prefix matching, and generating highlighted snippets using the snippet function.`

2. **Search Endpoint (`GET /search`)**:
   - Implement a Qwik City API endpoint at `GET /search` that accepts a query parameter `q` (e.g., `/search?q=resumability`).
   - If `q` is empty or missing, return a `200 OK` status with an empty JSON array `[]`.
   - Query the `articles_fts` table using the FTS5 `MATCH` operator.
   - Select the `title` and generate a highlighted snippet of the `content` column using SQLite's FTS5 `snippet()` auxiliary function with the following exact signature:
     `snippet(articles_fts, 1, '<b>', '</b>', '...', 10)`
     *(Which targets column index 1 (`content`), uses `<b>` and `</b>` as match tags, `...` as ellipsis, and 10 as the maximum number of tokens)*.
   - The response must be a JSON array of objects containing exactly these keys:
     - `title`: The title of the article.
     - `snippet`: The highlighted snippet text returned by the `snippet()` function.
   - **Error Handling**: SQLite FTS5 queries can throw syntax errors when given invalid search expressions (such as unclosed double quotes, dangling operators like `AND`, `OR`, or trailing `*` in invalid contexts). You must catch these database execution errors and return a `400 Bad Request` status with the JSON body:
     ```json
     { "error": "Invalid search query syntax" }
     ```

3. **Article Creation Endpoint (`POST /articles`)**:
   - Implement a Qwik City API endpoint at `POST /articles` that accepts a JSON body containing `title` and `content`.
   - If `title` or `content` is missing or empty, return a `400 Bad Request` status with the JSON body:
     ```json
     { "error": "Title and content are required" }
     ```
   - Insert the new article into `articles_fts` and return a `201 Created` status with the JSON body containing the newly created article details and its implicit SQLite `rowid`:
     ```json
     {
       "rowid": number,
       "title": "string",
       "content": "string"
     }
     ```

## Implementation Hints
- Project path: `/home/user/qwik-app`
- Start command: `npm run dev`
- Port: 3000
- Qwik City routes:
  - `GET /search`: Endpoint for performing full-text search queries.
  - `POST /articles`: Endpoint for inserting new articles.
- Ensure that all node-specific modules (such as database drivers or file-system utilities) are imported and used strictly within server-only boundaries (e.g., Qwik City endpoint handlers) to prevent them from leaking into client-side browser bundles and causing build or runtime failures.

