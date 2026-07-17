# Optimistic-UI Todo App with Server Reconciliation (Qwik City)

## Background
Build a full-stack todo application with Qwik City that uses **optimistic UI updates**. User interactions update local reactive state immediately, while a server action persists the change to a local SQLite database in the background. If the server reports a failure, the UI must roll back the optimistic change and surface an error; on success it reconciles with the server result.

## Requirements
- A single page at `/` that lists todos and lets the user add, toggle (complete/active), and delete todos.
- Todos are loaded on the server from a local SQLite database and rendered on the initial page load.
- Add, toggle, and delete update a client-side reactive store **immediately** (optimistically), before the server responds.
- Persistence happens via a Qwik City `routeAction$` that is invoked **programmatically** (not through a blocking `<Form>` navigation) so the UI stays responsive.
- Track a per-item in-flight (pending) state while that item's server persistence is running.
- On server failure, roll back the optimistic change, reconcile with the server truth, and show an error message.

## Implementation Hints
- Use `useStore` for the optimistic todo list and per-item pending flags; use `routeLoader$` for the initial data and `routeAction$` (triggered via `action.submit(...)`) for mutations.
- Keep all SQLite access inside server-only boundaries (the loader/action or a `.server` module) so no database module leaks into the client bundle.
- Generate a stable id on the client when adding a todo so the optimistic item can be reconciled with the persisted record.
- Project path: /home/user/optimistic-todo (a Qwik City project with its dependencies is already scaffolded there).
- Start command (run from the project path): `npm run dev`
- Port: 5173
- Persist data in a local SQLite database file at `data/todos.sqlite` (relative to the project root), using a table named `todos` with columns: `id` TEXT PRIMARY KEY, `title` TEXT NOT NULL, `completed` INTEGER NOT NULL DEFAULT 0 (0 = active, 1 = completed).
- Simulated failure: the server must refuse to persist any todo whose title begins with `FAIL` (return an action failure). When adding such a todo, it should appear optimistically, then be rolled back while an error message is displayed, and it must never be written to the database.
- Simulated latency: the server must delay persistence of any todo whose title begins with `SLOW` by at least 1000 ms before succeeding, so that the pending state is observable.
- Expose these DOM hooks in the UI (they are used by automated checks):
  - New-todo text input: `data-testid="new-todo-input"`.
  - Add button: `data-testid="add-todo"`.
  - Todo list container: `data-testid="todo-list"`.
  - Each todo row: `data-testid="todo-item"`, carrying a `data-title` attribute equal to the todo title, and `data-pending="true"` while its server persistence is in flight (absent or `"false"` otherwise).
  - Toggle control inside a row: an `input[type="checkbox"]` reflecting `completed`.
  - Delete control inside a row: `data-testid="delete-todo"`.
  - Error message element, shown only after a failed persistence: `data-testid="error-message"`.

## Notes
- The application must not depend on any external or network service at runtime; only the local SQLite database and local Qwik City endpoints may be used.

