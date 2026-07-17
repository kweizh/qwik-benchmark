# Tag-Filterable Article Listing with Qwik City and SQLite (Many-to-Many)

## Background
Build a server-rendered, tag-filterable article listing for a small blog using the **Qwik** framework (Qwik City meta-framework). Articles and tags have a **many-to-many** relationship stored in a **local SQLite** database through a join table. All data loading happens on the server via a `routeLoader$`, and the active tag filters are driven entirely by the page URL's query string so filtered pages are shareable and server-rendered.

Everything must run locally. No external APIs, cloud services, or network access to external hosts are allowed at runtime.

## Requirements
- Create a Qwik City application backed by a local SQLite database file.
- Model a many-to-many relationship between articles and tags using three tables: `articles`, `tags`, and a join table `article_tags`.
- Seed the database with exactly the data specified below (idempotently — re-running setup must not duplicate rows).
- Implement an article listing route at `/articles` whose data is produced by a `routeLoader$`. The loader must:
  - Read zero or more selected tags from the URL query string (repeated `tag` query parameter, e.g. `/articles?tag=javascript&tag=qwik`).
  - Return the set of articles that are tagged with **ALL** of the selected tags (AND filtering). With no `tag` parameter, return all articles.
  - Compute **tag facet counts**: for every tag, the number of articles **in the current filtered result set** that carry that tag.
- Render the listing UI so a user can toggle multiple tags on/off, with the active tag selection reflected in the URL query string; show the currently active filters; and link every listed article to its detail page at `/articles/<slug>`.
- Implement an article detail route at `/articles/<slug>` that shows the article title and lists all of that article's tags. Unknown slugs must respond with HTTP 404.

## Implementation Hints
- Use a `routeLoader$` for all server-side data access; keep the SQLite driver strictly inside server-only boundaries so no database module leaks into the client bundle.
- A local embedded SQLite library (for example `better-sqlite3`) is a good fit; the database is a plain file on disk.
- In a `routeLoader$`, the selected tags can be read from the request event's URL query string; use `useLocation()` / `useNavigate()` (or `<Link>`) in components to reflect toggles back into the URL.
- AND filtering across a join table can be done by grouping matches per article and requiring the match count to equal the number of selected tags.
- Project path: /home/user/qwik-app
- Start command: npm run preview
- Port: 3000 (the server must listen on 0.0.0.0:3000)
- The app is server-rendered; all checks below are performed against the HTML returned by the server (no client-side JavaScript execution is required for verification), so the required data MUST be present in the server-rendered HTML.

### Database schema (required)
- `articles`: at least `id` (integer primary key), `slug` (unique text), `title` (text).
- `tags`: at least `id` (integer primary key), `name` (unique text).
- `article_tags`: join table with `article_id` and `tag_id` referencing the two tables above.

### Seed data (required, exact)
Tags: `javascript`, `typescript`, `qwik`, `css`, `performance`.

Articles (slug — title — tags):
- `intro-to-qwik` — "Intro to Qwik" — javascript, qwik
- `typescript-basics` — "TypeScript Basics" — javascript, typescript
- `qwik-with-typescript` — "Qwik with TypeScript" — javascript, typescript, qwik
- `css-grid-guide` — "CSS Grid Guide" — css
- `web-performance-tips` — "Web Performance Tips" — javascript, performance
- `qwik-performance` — "Qwik Performance" — qwik, performance

### Required output shape (server-rendered HTML)
So the results are machine-checkable, render these stable hooks in the HTML:
- On `/articles`, render one element per matching article carrying the attribute `data-article="<slug>"`, and inside/near it an anchor whose `href` is `/articles/<slug>`.
- On `/articles`, render one facet element per tag carrying both `data-facet="<tag-name>"` and `data-count="<integer>"`, where the integer is the facet count for that tag over the current filtered result set.
- On `/articles`, for every currently selected tag render an element carrying the attribute `data-active-tag="<tag-name>"`.
- When the filter matches no articles, render zero `data-article` elements (an empty state is fine).
- On `/articles/<slug>`, render the article title and one element per tag carrying `data-tag="<tag-name>"`.

