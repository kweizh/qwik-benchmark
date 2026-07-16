Qwik City excels at server-side rendering and data pre-fetching to deliver zero-JS initial loads.

You need to implement a Qwik City route file at `src/routes/search/index.tsx` that utilizes a `routeLoader$` to read a `q` URL query parameter. The loader should query the local Typesense `books` collection strictly on the server and return the matched documents.

**Constraints:**
- Do not use client-side fetching for the initial page load.
- The returned data must be consumed by the default component and rendered directly into the initial HTML stream.
- The Typesense client instance must be kept inside the server execution boundary.