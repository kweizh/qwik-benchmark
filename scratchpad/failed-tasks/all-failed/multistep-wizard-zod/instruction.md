# Multi-Step Registration Wizard (Qwik City + Zod + SQLite)

## Background
Build a full-stack, server-validated multi-step registration wizard using **Qwik City**. The wizard collects a new user's data across three steps — **Account -> Profile -> Review** — validating each step **on the server** with `routeAction$` + `zod$`, persisting partial progress across steps, and finally writing the completed user into a **local SQLite** database. The app must be fully functional even without client-side JavaScript (progressive enhancement), because validation and navigation happen on the server.

## Requirements
- A three-step wizard served by Qwik City at these page routes:
  - `/register/` — **Account** step. Fields: `email`, `password`, `confirmPassword`.
  - `/register/profile/` — **Profile** step. Fields: `fullName`, `age`, `country`.
  - `/register/review/` — **Review** step. Shows the data entered so far (email, fullName, age, country — never the password) and a final submit control.
  - `/register/success/` — **Confirmation** page shown after a successful registration; it must display the registered `email`.
- Each step's form must be submitted to a server `routeAction$` validated by `zod$`. On validation failure the same step must re-render (HTTP 200, not advancing), preserve the submitted values, and show field-specific error messages.
- On successful validation of a step, the server must advance the user to the next step via an HTTP redirect (302/303).
- Partial progress must be persisted **on the server** and associated with the browser via a cookie, so that navigating **back** to an earlier step re-displays the previously entered values (the input elements must be pre-filled).
- The final submit on the Review step must write the completed user to local SQLite and then redirect to `/register/success/`.

## Validation Rules (enforced server-side with Zod)
- Account step:
  - `email`: must be a syntactically valid email address, AND must not already exist in the `users` table (uniqueness enforced against the database).
  - `password`: at least 8 characters and must contain at least one lowercase letter, one uppercase letter, and one digit.
  - `confirmPassword`: must exactly equal `password`.
- Profile step:
  - `fullName`: at least 2 characters.
  - `age`: an integer that is at least 18.
  - `country`: a non-empty string.

## Implementation Hints
- Project path: /home/user/qwik-wizard
- Scaffold a Qwik City app (the non-interactive `empty` starter is a good base) and add directory-based routes under `src/routes/register/`.
- Use `routeAction$(..., zod$({ ... }))` for server-side validation; return field errors via the action's failure/`fieldErrors` mechanism and render them in the step's markup. Use `routeLoader$` to read the persisted partial progress and pre-fill inputs.
- Persist the cross-step state on the server keyed by a session cookie (set/read it via the `RequestEvent` cookie API). Advance between steps using a server redirect after successful validation.
- Use a local SQLite database — recommended driver `better-sqlite3` — created at the fixed path `/home/user/qwik-wizard/db/app.db`. Keep all SQLite/Node-only code inside server boundaries (`routeAction$`/`routeLoader$`/`server$` or a `*.server.ts` module) so it does not leak into the client bundle.
- The database must contain a `users` table with (at least) these columns: `id` (integer primary key, autoincrement), `email` (text, unique), `password` (text), `full_name` (text), `age` (integer), `country` (text). Create the table automatically on startup if it does not exist.
- Never store the plaintext password — persist it using a one-way hash instead.
- The app must work without client JavaScript: forms submit natively and the server handles validation, redirects, and rendering.
- Start command: `npm run dev -- --port 3000 --host 0.0.0.0`
- Port: 3000

