# Qwik Nested Comments

A threaded (nested reply) comment system using Qwik City backed by a local SQLite database.

## Develop

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

## Database

The SQLite database lives at `comments.db` in the project root. If the file is
missing or empty, the server seeds it with four starter comments.

## Features

* Arbitrarily-deep nested replies
* Collapse/expand any subtree
* Reply form on every comment plus a top-level form for new root comments
* Server-side validation using `zod$`
* Reply counts that include all nested descendants