# Infinite-Scroll Feed with Qwik City

## Background
You are building a social-style content feed with the **Qwik** framework and **Qwik City** meta-framework. The feed must render its first page on the server (no client JavaScript needed to see the initial content) and then progressively load more content on the client as the user scrolls, using cursor-based pagination backed by a **local SQLite** database. All data must come from the local database through server-only code; the browser must never talk to any external service.

## Requirements
- Build a Qwik City application whose home route (`/`) renders a scrollable feed.
- Persist the feed content in a **local SQLite** database file inside the project. Seed it with **exactly 47 posts**: for every integer `N` from 1 to 47 there must be a post whose title is exactly `Post #N`. Each post also has some body text.
- The feed is ordered by ascending post id and paginated with a **page size of 10** (so the pages contain 10, 10, 10, 10, then the final 7 posts).
- The **initial page** (the first 10 posts, `Post #1` .. `Post #10`) must be produced on the server with `routeLoader$` and be present in the server-rendered HTML.
- Loading of every subsequent page must be performed by a **`server$()` RPC** call that accepts a cursor (the id of the last item already loaded) and returns the next page of posts plus whether more posts remain. The database access must live only inside server code so that no database/Node-only module leaks into the client bundle.
- On the client, use an `IntersectionObserver` created inside `useVisibleTask$` that watches a sentinel element at the bottom of the list. When the sentinel becomes visible, fetch the next page via the `server$()` function and append the new posts into a `useStore` list. Stop requesting once the server reports there are no more posts.
- While a page is being fetched, show a loading indicator. When all posts have been loaded, show an end-of-feed indicator and stop observing.

## Implementation Hints
- Scaffold a Qwik City app (for example with `npm create qwik@latest empty <dir>`), then add a local SQLite driver such as `better-sqlite3`.
- Keep all SQLite imports and queries inside `routeLoader$` / `server$()` (or a `*.server.ts` module) so the optimizer does not pull server-only modules into the browser bundle.
- Remember that `server$()` receives the `RequestEvent` via `this`, can accept arguments, and returns any Qwik-serializable value.
- Accumulate loaded posts in a `useStore` so newly fetched pages are appended reactively; `IntersectionObserver` and other browser-only APIs belong in `useVisibleTask$`.
- Project path: /home/user/qwik-app
- Start command: npm run dev -- --port 3000 --host
- Port: 3000
- Route: `/` renders the feed.
- DOM contract that will be checked (attach these exact hooks):
  - Every rendered feed post is an element carrying the attribute `data-testid="feed-item"`, and its visible text contains the post title (e.g. `Post #1`).
  - A loading indicator element carries `data-testid="feed-loading"` and is present in the DOM only while a page is being fetched.
  - An end-of-feed indicator element carries `data-testid="feed-end"` and appears only after the last post has been loaded; its visible text must contain the phrase `End of feed`.
  - A sentinel element carrying `data-testid="feed-sentinel"` sits at the bottom of the list and is what the `IntersectionObserver` watches.
- The feed must never render duplicate posts, and after scrolling to the very bottom all 47 posts (`Post #1` .. `Post #47`) must be present exactly once.

