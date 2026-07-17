# Qwik City Activity Log Tracker Middleware

## Background
In web applications, tracking user activity and API performance is essential for monitoring, security, and optimization. You need to implement an activity logging middleware in a Qwik City application that intercepts requests, measures their execution duration, and logs them to a local SQLite database.

## Requirements
- Implement a Qwik City middleware that logs all incoming HTTP requests to paths starting with `/api/` or `/admin/` (including nested paths).
- Do NOT log requests to paths that do not start with `/api/` or `/admin/` (e.g., `/public-page` or `/`).
- Store the logs in a local SQLite database table named `ActivityLog`.
- Implement a set of test endpoints (`/api/ping`, `/api/slow`, `/admin/dashboard`, `/public-page`) to verify the middleware's logging and timing functionality.
- Create an admin activity page at `/admin/activity` that displays metrics and recent logs in both HTML and JSON formats.
- Ensure the middleware and database operations are robust under concurrent request loads.

## Implementation Hints
- Project path: `/home/user/qwik-app`
- Start command: `npm run dev`
- Port: `3000`
- **Database Specifications**:
  - Database file path: `/home/user/qwik-app/activity.db`
  - Table name: `ActivityLog`
  - Table schema:
    - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
    - `path`: TEXT NOT NULL (the request path, e.g., `/api/ping`)
    - `method`: TEXT NOT NULL (the HTTP method, e.g., `GET`)
    - `ip`: TEXT NOT NULL (the client's IP address)
    - `timestamp`: TEXT NOT NULL (the ISO 8601 string when the request was received, e.g., `2026-08-01T12:34:56.789Z`)
    - `duration_ms`: INTEGER NOT NULL (the actual execution duration of the request in milliseconds)
- **Middleware Logging Rules**:
  - Capture the exact elapsed time (in milliseconds) from when the request is received by the middleware until the route handler finishes processing and the response is ready.
  - The log entry must be successfully written to the SQLite database even if multiple requests are processed concurrently.
- **Required Endpoints & Pages**:
  1. **GET `/api/ping`**:
     - Returns JSON: `{"ping": "pong"}`
  2. **GET `/api/slow`**:
     - Accepts a query parameter `delay` (an integer representing milliseconds).
     - Delays the response by the specified number of milliseconds.
     - Returns JSON: `{"delayed": true, "delay": <delay>}`
  3. **GET `/admin/dashboard`**:
     - Returns a simple HTML page or text containing `Admin Dashboard`.
  4. **GET `/public-page`**:
     - Returns a simple HTML page or text containing `Public Page`.
  5. **GET `/admin/activity`**:
     - **HTML Format (Default)**: Returns an HTML page containing:
       - An element with `id="total-requests"` containing only the total number of logged requests (integer).
       - An element with `id="average-duration"` containing the average duration of all logged requests in milliseconds, rounded to 2 decimal places (or `0` if no logs exist).
       - A container element with `id="logs-list"` containing the list of recent logs.
     - **JSON Format (when queried as `/admin/activity?format=json`)**:
       - Returns status 200 and a JSON object with the following structure:
         ```json
         {
           "total_requests": number,
           "average_duration_ms": number,
           "logs": [
             {
               "id": number,
               "path": string,
               "method": string,
               "ip": string,
               "timestamp": string,
               "duration_ms": number
             }
           ]
         }
         ```
       - The `logs` array must contain all logged requests, ordered by `timestamp` in descending order (most recent first).
       - `average_duration_ms` must be rounded to 2 decimal places (or `0` if no logs exist).

