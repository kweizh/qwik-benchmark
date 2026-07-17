# Qwik Scheduled Tasks Dashboard

## Background
In modern web applications, managing background scheduled jobs and monitoring their execution status is a common requirement. In this task, you will build a self-contained scheduled tasks dashboard using Qwik (Qwik City) and SQLite.

## Requirements
- Build a web application using Qwik City that serves as a scheduled tasks manager and dashboard.
- Store all tasks and their execution history in a local SQLite database.
- Create a background interval runner within the application process that continuously polls the database and executes active tasks based on their configured interval.
- Tasks are defined by shell commands. The background runner executes these commands, captures their exit status, and logs the execution results (success or failure) to the database history.
- Implement a user interface at `/tasks` allowing users to view, create, pause/resume, and manually trigger tasks.
- Implement a complete set of REST API endpoints under `/api/tasks` to allow programmatic control and automated verification of tasks.

## Implementation Hints
- **Project Path**: `/home/user/qwik-app`
- **Start Command**: `npm run dev`
- **Port**: `3000`
- **Database File**: `/home/user/qwik-app/tasks.db`
- **Database Schema**:
  - Table `tasks`:
    - `id` (TEXT, PRIMARY KEY) - unique identifier (slug or UUID)
    - `name` (TEXT, NOT NULL) - human-readable name
    - `command` (TEXT, NOT NULL) - the shell command to execute
    - `interval_seconds` (INTEGER, NOT NULL) - execution interval in seconds
    - `status` (TEXT, NOT NULL) - must be either `'ACTIVE'` or `'PAUSED'`
  - Table `execution_history`:
    - `id` (INTEGER, PRIMARY KEY, AUTOINCREMENT)
    - `task_id` (TEXT, NOT NULL) - foreign key referencing `tasks.id`
    - `status` (TEXT, NOT NULL) - must be either `'SUCCESS'` or `'FAILED'`
    - `timestamp` (TEXT, NOT NULL) - ISO8601 UTC timestamp format (e.g., `YYYY-MM-DDTHH:MM:SS.SSSZ`)

- **API Endpoints**:
  - **GET `/api/tasks`**:
    - Returns a JSON array of all tasks.
    - Status: 200 OK
    - Response schema:
      ```json
      [
        {
          "id": "task-id",
          "name": "Task Name",
          "command": "echo 'hello'",
          "interval_seconds": 5,
          "status": "ACTIVE"
        }
      ]
      ```
  - **POST `/api/tasks`**:
    - Creates a new task.
    - Status: 201 Created
    - Request body schema:
      ```json
      {
        "id": "task-id",
        "name": "Task Name",
        "command": "echo 'hello'",
        "interval_seconds": 5,
        "status": "ACTIVE"
      }
      ```
    - Response body schema: Same as request body (the created task object).
    - If validation fails (e.g., missing fields, interval <= 0, invalid status), returns 400 Bad Request with a JSON error object.
  - **POST `/api/tasks/:id/pause`**:
    - Pauses an active task.
    - Status: 200 OK
    - Response body schema:
      ```json
      {
        "id": "task-id",
        "status": "PAUSED"
      }
      ```
  - **POST `/api/tasks/:id/resume`**:
    - Resumes a paused task.
    - Status: 200 OK
    - Response body schema:
      ```json
      {
        "id": "task-id",
        "status": "ACTIVE"
      }
      ```
  - **POST `/api/tasks/:id/trigger`**:
    - Triggers the task immediately in the background, executing the command and writing to `execution_history`.
    - Status: 200 OK
    - Response body schema:
      ```json
      {
        "id": "task-id",
        "triggered": true
      }
      ```
  - **GET `/api/tasks/:id/history`**:
    - Returns execution history logs for the specified task, sorted by `timestamp` descending.
    - Status: 200 OK
    - Response body schema:
      ```json
      [
        {
          "id": 1,
          "task_id": "task-id",
          "status": "SUCCESS",
          "timestamp": "2026-08-01T23:46:46.000Z"
        }
      ]
      ```

- **Frontend Routing**:
  - **GET `/tasks`**:
    - Renders an HTML page.
    - Displays all tasks and their current statuses.
    - Displays a table/list of the recent execution history logs.
    - Displays a form to create a new task.
    - Provides buttons or forms to pause, resume, and manually trigger each task.

- **Background Runner Constraints**:
  - When the Qwik application is running via `npm run dev`, the background runner must be active.
  - It must execute active tasks' shell commands at least once every `interval_seconds`.
  - If the command exits with code `0`, log the execution as `'SUCCESS'`. Any other exit code must be logged as `'FAILED'`.
  - It must insert a row into `execution_history` with the exact task ID, status, and current UTC ISO8601 timestamp for every execution.
  - It must not block the main server thread or prevent HTTP requests from being handled.
  - Pausing a task must immediately stop its interval execution. Resuming a task must resume its interval execution.
