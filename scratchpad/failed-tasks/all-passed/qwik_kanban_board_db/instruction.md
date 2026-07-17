# Qwik Kanban Board with SQLite Reordering

## Background
In modern web applications, rich interactive interfaces like Kanban boards require robust server-side state synchronization. In this task, you will build a self-contained Kanban board application using Qwik and Qwik City, backed by a local SQLite database. The application must support displaying tasks in columns, adding new tasks, and reordering tasks across columns with automatic sequential position updates.

## Requirements
- **Database Storage**:
  - Use a local SQLite database file at `/home/user/qwik-app/kanban.db`.
  - The database must contain a table named `tasks` with the following schema:
    - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
    - `title`: TEXT NOT NULL
    - `column`: TEXT NOT NULL (must be one of `'TODO'`, `'IN_PROGRESS'`, `'DONE'`)
    - `position`: INTEGER NOT NULL
  - Database operations must be transactional to prevent race conditions or corruptions during concurrent updates.
- **Kanban Board UI (`/kanban`)**:
  - Render three columns corresponding to `'TODO'`, `'IN_PROGRESS'`, and `'DONE'`.
  - Each column container must have a `data-column` attribute matching its column name (e.g., `data-column="TODO"`).
  - Within each column, list the tasks assigned to it, ordered by `position` ascending.
  - Each task must be rendered inside an element with the class `task-item` and a `data-task-id` attribute matching its database ID.
  - Provide a form with `id="add-task-form"` containing a text input with `name="title"` and a submit button. Submitting this form adds a new task to the end of the `'TODO'` column.
- **API Endpoints**:
  - **GET `/kanban/tasks`**: Returns a flat JSON array of all tasks in the database, ordered by `column` ascending (using alphabetical or standard order, but for deterministic verification, ordered by `column` then `position` ascending).
  - **POST `/kanban/add`**: Accepts a JSON body or form-data with `{ "title": string }`, inserts a new task at the end of the `'TODO'` column (position = current count of tasks in `'TODO'`), and returns HTTP 201 with the created task JSON.
  - **POST `/kanban/move`**: Moves a task to a target column and position, updating the positions of other tasks to maintain a sequential index starting from 0 without gaps.

## Reordering Algorithm
When a task is moved via `POST /kanban/move`:
- Let $C_{src}$ and $P_{src}$ be the source column and original position of the moved task.
- Let $C_{dest}$ and $P_{dest}$ be the target column and target position.
- **If moving within the same column ($C_{src} == C_{dest}$)**:
  - If $P_{src} == P_{dest}$, no changes.
  - If $P_{src} < P_{dest}$: Decrement the position of all tasks in $C_{src}$ with positions in the range $[P_{src} + 1, P_{dest}]$ by 1. Set the moved task's position to $P_{dest}$.
  - If $P_{src} > P_{dest}$: Increment the position of all tasks in $C_{src}$ with positions in the range $[P_{dest}, P_{src} - 1]$ by 1. Set the moved task's position to $P_{dest}$.
- **If moving to a different column ($C_{src} \neq C_{dest}$)**:
  - Decrement the position of all tasks in $C_{src}$ with positions $> P_{src}$ by 1.
  - Increment the position of all tasks in $C_{dest}$ with positions $\ge P_{dest}$ by 1.
  - Set the moved task's column to $C_{dest}$ and position to $P_{dest}$.
- **Validation**:
  - If `taskId` does not exist, return HTTP 404.
  - If `targetColumn` is not one of `'TODO'`, `'IN_PROGRESS'`, `'DONE'`, return HTTP 400.
  - If `targetPosition` is out of bounds (negative, or greater than the number of tasks in the target column after/during insertion), return HTTP 400.

## Implementation Hints
- Project path: `/home/user/qwik-app`
- Start command: `npm run dev`
- Port: 3000
- **API Specifications**:
  - **GET `/kanban/tasks`**:
    - Response status: 200 OK
    - Response body JSON array of objects:
      ```json
      [
        {
          "id": number,
          "title": string,
          "column": "TODO" | "IN_PROGRESS" | "DONE",
          "position": number
        }
      ]
      ```
  - **POST `/kanban/add`**:
    - Request body:
      ```json
      {
        "title": string
      }
      ```
    - Response status: 201 Created
    - Response body:
      ```json
      {
        "id": number,
        "title": string,
        "column": "TODO",
        "position": number
      }
      ```
  - **POST `/kanban/move`**:
    - Request body:
      ```json
      {
        "taskId": number,
        "targetColumn": "TODO" | "IN_PROGRESS" | "DONE",
        "targetPosition": number
      }
      ```
    - Response status: 200 OK
    - Response body:
      ```json
      {
        "success": true
      }
      ```

