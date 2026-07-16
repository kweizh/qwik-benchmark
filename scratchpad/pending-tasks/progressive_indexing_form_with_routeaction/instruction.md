Handling form submissions securely on the server while supporting environments without JavaScript is a primary feature of Qwik City.

You need to implement a "Create Book" page at `src/routes/admin/add-book/index.tsx`. The page must contain a Qwik City `<Form>` bound to a `routeAction$`. The action must receive `title`, `author`, and `year` payloads, validate them, and insert the new document into the Typesense `books` collection.

**Constraints:**
- The form submission must function progressively (without relying on client-side JS execution).
- The `routeAction$` must return a success object containing the newly generated Typesense document ID upon successful insertion.
- Handle invalid payload types by returning an appropriate error object.