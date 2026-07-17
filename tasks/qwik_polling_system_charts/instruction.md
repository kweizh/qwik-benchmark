# Qwik Polling System with Dynamic SVG Charts

## Background
Build a self-contained polling system using Qwik and Qwik City. The application will fetch poll questions and options from a local SQLite database, display them to the user, render a dynamic SVG-based bar chart of the results, and allow users to cast votes. To ensure high-quality engineering, the system must handle concurrent voting requests correctly and enforce an IP-based rate limit to prevent voting spam.

## Requirements
- **Route `/poll/:id`**:
  - Fetches the poll and its options from the SQLite database.
  - Renders the poll question.
  - Renders the current results as a custom SVG bar chart.
  - Renders voting buttons/options for the user to cast a vote.
- **Route POST `/poll/:id/vote`**:
  - Casts a vote for a specific option of the poll.
  - Inserts a record or increments the vote count in the SQLite database.
  - Enforces an IP-based rate limit (1 vote per 5 seconds per poll per IP).
  - Returns the updated vote counts for all options of that poll.
- **Dynamic SVG Chart**:
  - The chart must be rendered directly as SVG elements in the DOM.
  - It must update dynamically when a vote is cast (either via client-side reactivity or page re-rendering).
- **Concurrency & Reliability**:
  - Database updates must be atomic and thread-safe to handle concurrent vote requests without losing votes or locking up the database.

## Implementation Hints
- Project path: `/home/user/qwik-app`
- Start command: `npm run dev`
- Port: 3000
- **SQLite Database**:
  - The database file is located at `/home/user/qwik-app/poll.db`.
  - It contains the following tables:
    - `polls`: `id` (TEXT PRIMARY KEY), `question` (TEXT NOT NULL)
    - `options`: `id` (INTEGER PRIMARY KEY AUTOINCREMENT), `poll_id` (TEXT NOT NULL, FOREIGN KEY REFERENCES polls(id)), `text` (TEXT NOT NULL), `votes` (INTEGER NOT NULL DEFAULT 0)
    - `votes_log`: `id` (INTEGER PRIMARY KEY AUTOINCREMENT), `poll_id` (TEXT NOT NULL), `ip` (TEXT NOT NULL), `timestamp` (INTEGER NOT NULL)
  - The database is pre-seeded with the following data:
    - Poll `frameworks`: `What is your favorite frontend framework?`
      - Option `1`: `Qwik` (initial votes: 0)
      - Option `2`: `React` (initial votes: 0)
      - Option `3`: `Vue` (initial votes: 0)
      - Option `4`: `Svelte` (initial votes: 0)
    - Poll `colors`: `What is your favorite primary color?`
      - Option `5`: `Red` (initial votes: 0)
      - Option `6`: `Blue` (initial votes: 0)
      - Option `7`: `Yellow` (initial votes: 0)
- **Page `/poll/:id` HTML Structure**:
  - The question must be rendered in an element with `id="poll-question"`.
  - The SVG chart must have `id="poll-chart"`, `width="500"`, and `height="300"`.
  - For each option, the SVG chart must contain:
    - A `<rect>` element with `class="chart-bar"` and `data-option-id="<option_id>"`. The width of the rect should be proportional to the option's vote percentage (scaled to a maximum width of 400 pixels). If the total votes for the poll are 0, the width must be 0.
    - A `<text>` element with `class="vote-count"` and `data-option-id="<option_id>"`. Its text content must contain the option's current integer vote count (e.g., "0", "12", etc.).
  - For each option, there must be a button or element to cast a vote with `class="vote-button"` and `data-option-id="<option_id>"`.
  - If the poll ID does not exist in the database, the route must return HTTP status code 404 with a "Poll not found" message.
- **API POST `/poll/:id/vote` Contract**:
  - Accepts JSON payload: `{"optionId": <number>}`.
  - On success (200 OK), returns updated vote counts for all options of the poll:
    ```json
    {
      "success": true,
      "votes": {
        "<option_id_1>": <votes_1>,
        "<option_id_2>": <votes_2>,
        ...
      }
    }
    ```
    *(Keys in the `votes` object must be the string representation of the option IDs, and values must be integer vote counts)*.
  - On rate limit violation (429 Too Many Requests), returns:
    ```json
    {
      "error": "Rate limit exceeded"
    }
    ```
  - On missing/invalid `optionId` (400 Bad Request), returns:
    ```json
    {
      "error": "Invalid option ID"
    }
    ```
  - On non-existent poll or option (404 Not Found), returns:
    ```json
    {
      "error": "Poll or option not found"
    }
    ```
- **Rate Limiting Rules**:
  - The client's IP address must be extracted from the `X-Forwarded-For` header (if present, use the first comma-separated value) or fall back to the connection socket IP.
  - Each IP is allowed to vote at most once every 5 seconds per poll ID. If a vote is cast within 5 seconds of a previous vote from the same IP for the same poll, the server must reject it with a 429 status code and not increment the database vote count.
- **Concurrency Requirement**:
  - Multiple concurrent POST requests to vote must be processed without causing database locks, deadlocks, or lost updates. Ensure transactions or atomic increments are used.

