# Cookie-Based Session Authentication in Qwik City

## Background
You are building the authentication layer for a small Qwik City application. A base Qwik City project (the `empty` starter) is already scaffolded at the project path with all dependencies installed, including `better-sqlite3` for local persistence. Your job is to implement a complete cookie-based session authentication flow using Qwik City server primitives (`routeAction$`, `routeLoader$`, layout middleware `onRequest`, and the `RequestEvent` cookie API). Everything must run locally: authentication is backed by a local SQLite database and browser cookies only. Do NOT call any external service, API, or identity provider.

## Requirements
- A local SQLite database holds application users. Seed exactly one user on initialization with username `alice` and password `s3cret-pass`. The password MUST be stored hashed (never in plaintext) — use Node's built-in `crypto` (e.g. scrypt/pbkdf2) for hashing and verification.
- A public login page at `/login` renders a Qwik City `<Form>` (backed by a `routeAction$`) with a text input named `username` and a password input named `password`, plus a submit button.
- On a successful login the action must validate the submitted credentials against the SQLite users table, establish a session, set an **HTTP-only** cookie named `session`, and redirect the browser to `/dashboard`.
- On a failed login (unknown user or wrong password) the action must NOT set the `session` cookie and must re-render `/login` showing an error message that contains the text `Invalid username or password`.
- A protected page at `/dashboard` must be guarded by shared **layout middleware** (`onRequest`, and/or a `routeLoader$` in the layout). Requests without a valid `session` cookie must be redirected to `/login`. Authenticated requests must render a page that contains the logged-in user's username (`alice`) and a logout control.
- A logout `routeAction$` must clear the `session` cookie and redirect to `/login`. After logging out, visiting `/dashboard` must again redirect to `/login`.

## Implementation Hints
- Keep all server-only code (SQLite access, `crypto`, session lookup) inside `routeLoader$` / `routeAction$` / `onRequest` boundaries so it never leaks into client bundles. A `*.server.ts` helper module is a clean way to share DB and hashing logic.
- Use the `RequestEvent` cookie API (`cookie.set`, `cookie.get`, `cookie.delete`) to manage the `session` cookie; set it with `httpOnly: true` and `path: '/'`.
- Use `throw redirect(302, '/login')` from the layout middleware to guard protected routes, and redirect to `/dashboard` after a successful login.
- A route group (e.g. `src/routes/(app)/`) with its own `layout.tsx` is a convenient place to put the guard so only protected routes are affected while `/login` stays public.
- Store the SQLite database file somewhere under the project directory.
- Project path: /home/user/qwik-auth
- Start command: npm run dev -- --port 3000 --host
- Port: 3000
- Routes and expected behavior:
  - `GET /login`: returns HTTP 200 and HTML containing a `<form>` (rendered by Qwik `<Form>`) with inputs named `username` and `password`.
  - Login submission (native `<form>` POST to the action path found in the login form's `action` attribute): with valid credentials responds with a redirect (status 302/303) whose `Location` is `/dashboard`, and a `Set-Cookie` header for `session` that includes the `HttpOnly` attribute; with invalid credentials responds without a `session` cookie and the returned/loaded page contains `Invalid username or password`.
  - `GET /dashboard`: without a valid `session` cookie redirects (3xx) to `/login`; with a valid session returns HTTP 200 and HTML containing `alice` and a logout control.
  - Logout submission: clears the `session` cookie (a `Set-Cookie` that expires/removes it) and redirects to `/login`.

