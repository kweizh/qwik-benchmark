Before performing any search operations, the Typesense instance needs a predefined schema for its collections.

You need to write a Node.js script named `bootstrap.js` that connects to the local Typesense container and creates a `books` collection. The schema must strictly define three fields: `title` (string), `author` (string), and `year` (int32).

**Constraints:**
- Use the official `typesense` npm package.
- Target `http://localhost:8108` using the `dev-api-key`.
- The script must log "Collection created successfully" upon completion and handle duplicate collection errors gracefully.