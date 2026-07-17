# Nested Comment Threads with Qwik City and SQLite

## Background
Build a threaded (nested reply) comment system using Qwik City backed by a local SQLite database. Any comment can be replied to at any depth, forming an arbitrarily deep tree. The server loads the entire comment tree and the UI renders it recursively, with the ability to collapse/expand any subtree and to add replies to any comment.

## Requirements
- Render all comments as a nested tree on the page at route `/`.
- Persist comments in a local SQLite database. Each comment has: an id, an optional parent id (null for top-level comments), an author, a body, and a creation timestamp.
- Use a `routeLoader$` to load the full set of comments on the server and render them as an arbitrarily deep nested tree using a recursive Qwik component.
- Each comment displays its author, its body, and the total number of nested replies (all descendants).
- Each comment that has at least one reply provides a control to collapse/expand its subtree.
- Provide a reply form on each comment that adds a child reply to that comment, plus a top-level form that adds a new root comment.
- Use a `routeAction$` together with `zod$` validation to add replies. Both author and body are required (non-empty); invalid submissions must be rejected with a visible error and must not be persisted.

## Implementation Hints
- Keep all database access inside server-only boundaries (`routeLoader$` / `routeAction$`); never let SQLite modules leak into client bundles.
- Loading the whole tree with a recursive SQL query (a recursive CTE) or building the tree in memory are both acceptable — what matters is that nesting and reply counts are correct.
- A recursive Qwik component is the natural way to render an arbitrarily deep tree, and Qwik's fine-grained reactivity (e.g. `useSignal`) fits the per-subtree collapse state.
- Use a local SQLite driver such as `better-sqlite3`; no external database or network service may be used.
- Project path: /home/user/qwik-comments
- The SQLite database file must be located at /home/user/qwik-comments/comments.db and must contain a table named `comments` with these exact columns: `id` (integer primary key, auto-increment), `parent_id` (integer, nullable, referencing `comments.id`, null for top-level comments), `author` (text), `body` (text), and `created_at` (text or integer timestamp).
- Seed the database when it is empty with exactly these four comments, preserving the parent/child relationships:
  - author "alice", body "Welcome to the thread" (top-level)
  - author "bob", body "Thanks alice!" (reply to alice)
  - author "carol", body "Agreed, great start" (reply to bob)
  - author "dave", body "Separate top-level thought" (top-level)
- Start command: npm run dev -- --port 3000 (the app must be reachable at http://localhost:3000)
- Port: 3000
- Rendering contract (the verifier depends on these):
  - Each rendered comment element must carry the attributes `data-comment-id="<id>"` and `data-depth="<n>"`, where top-level comments have depth 0 and each nested level increases depth by 1.
  - Each comment must expose its total descendant reply count via an element carrying the attribute `data-reply-count="<count>"`, counting all nested replies (not only direct children).
  - Child comments must be rendered nested within their parent comment's DOM subtree.
  - Each comment that has at least one reply must render a toggle control carrying the attribute `data-testid="toggle-<id>"` that hides its descendant subtree when collapsed and shows it again when expanded.
  - Each comment must render a reply form containing a text input named `author` and a text input (or textarea) named `body`; submitting it adds a reply whose parent is that comment.
  - Adding a reply must persist the new row to the SQLite database, and after submission the new comment must appear nested under the correct parent with updated reply counts.
  - A submission with an empty author or empty body must be rejected (a validation error is shown) and must not create a new row.

