# Markdown Notes Manager (Qwik City + SQLite)

## Background
Build a full-stack **Markdown Notes** manager using the **Qwik** framework and its meta-framework **Qwik City**. Notes are stored in a local SQLite database, written in Markdown, and rendered as sanitized HTML on the server. All server-side data loading and mutations must go through Qwik City's server primitives (`routeLoader$` and `routeAction$`), and all data must be persisted locally — the app must never call any external network service at runtime.

## Requirements
- A notes list page at `/notes` that:
  - Loads and displays all existing notes (server-side, via a `routeLoader$`), showing each note's title as a link to its detail page.
  - Provides a form to **create** a new note (title + Markdown content).
  - Provides a way to **delete** each note from the list.
- A note detail page at `/notes/[id]` that loads a single note server-side and renders its Markdown content as **sanitized HTML** (headings, lists, emphasis, etc. must render as real HTML elements; dangerous content such as `<script>` tags must be stripped and must not appear in the output).
- An edit page at `/notes/[id]/edit` that loads the existing note into an editable form and **updates** it.
- Create, update, and delete must each be implemented as separate server-side `routeAction$` handlers with **`zod$` validation**.
- Data is persisted in a local SQLite database using `better-sqlite3`; notes survive across separate HTTP requests.

## Implementation Hints
- Scaffold a Qwik City app (the `empty` starter includes routing) and use directory-based routing for the three routes.
- Do all database access and Markdown-to-HTML conversion strictly inside server-only boundaries (`routeLoader$` / `routeAction$`) so that native/server modules never leak into the client bundle.
- Use a locally-installed Markdown library to convert Markdown to HTML and a sanitizer to strip unsafe HTML before rendering it (Qwik supports the `dangerouslySetInnerHTML` prop).
- Use `zod$` schemas so that submissions with a blank title or empty content are rejected without writing to the database, and the form is re-rendered (retaining the user's input) with an error indication.
- After a successful create the note must appear on `/notes`; after a successful update the new values must be reflected; after a delete the note must be gone from `/notes`.
- Requesting a note detail page for an id that does not exist must respond with HTTP status 404.
- Project path: /home/user/qwik-notes
- Start command: `npm run dev -- --port 5173 --host 127.0.0.1`
- Port: 5173
- Routes:
  - `GET /notes`: list page (title links point to `/notes/<id>`), a create form, and a delete control per note.
  - `GET /notes/<id>`: detail page rendering the note's title and its Markdown content as sanitized HTML; returns status 404 for an unknown id.
  - `GET /notes/<id>/edit`: edit page pre-filled with the note's current title and Markdown content.

