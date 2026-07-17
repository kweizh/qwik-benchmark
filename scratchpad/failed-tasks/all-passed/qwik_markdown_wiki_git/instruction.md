# Local Markdown Wiki with History in Qwik City

## Background
Create a local collaborative Markdown wiki with page revision history using the Qwik City meta-framework and a local SQLite database.

## Requirements
- **Route `/wiki/:slug`**:
  - Renders the Markdown file contents for the given `:slug` to HTML.
  - The markdown files are stored in `/home/user/qwik-app/wiki-pages/[slug].md`.
  - The rendered HTML must be wrapped in an element with class `wiki-content`.
  - If the markdown file for the given slug does not exist, the route must return a `404` HTTP status code.
- **POST `/wiki/:slug/edit`**:
  - Accepts a page edit submission. It must handle form-urlencoded or JSON requests with fields:
    - `content` (string): The markdown text content.
    - `user` (string): The username of the editor.
  - On receipt, it must:
    - Save the markdown text to `/home/user/qwik-app/wiki-pages/[slug].md` (creating the directory `/home/user/qwik-app/wiki-pages` if it does not exist).
    - Insert a revision log entry into a local SQLite database at `/home/user/qwik-app/wiki.db` in a table named `revisions`.
    - Redirect the client to `/wiki/:slug` with a `302` or `303` redirect, or return a JSON response containing `{"success": true}` with a `200` or `201` status code.
- **Route `/wiki/:slug/history`**:
  - Retrieves all revision log entries for the given `:slug` from the SQLite database.
  - Returns a JSON array of revision objects, sorted by `timestamp` in descending order.
- **Database Schema**:
  - SQLite database path: `/home/user/qwik-app/wiki.db`
  - Table name: `revisions`
  - Columns:
    - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
    - `slug`: TEXT NOT NULL
    - `user`: TEXT NOT NULL
    - `timestamp`: INTEGER NOT NULL (Unix timestamp in milliseconds)
    - `content_length`: INTEGER NOT NULL (character length of the markdown text)

## Implementation Hints
- Project path: `/home/user/qwik-app`
- Start command: `npm run dev`
- Port: 3000
- **API & Routing Contracts**:
  - GET `/wiki/:slug`:
    - Success: Returns status `200` with the rendered HTML inside an element with class `wiki-content`.
    - Missing: Returns status `404` if the markdown file does not exist.
  - POST `/wiki/:slug/edit`:
    - Accepts fields `content` and `user` via standard form submission or JSON.
    - Returns a redirect (status `302`/`303` to `/wiki/:slug`) or a JSON response `{"success": true}` (status `200`/`201`).
  - GET `/wiki/:slug/history`:
    - Returns status `200` with a JSON array of revisions:
      ```json
      [
        {
          "id": 1,
          "slug": "home",
          "user": "alice",
          "timestamp": 1717200000000,
          "content_length": 42
        }
      ]
      ```
      Sorted by `timestamp` descending.

