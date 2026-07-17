# Server-Driven Paginated, Sortable & Searchable Product Table (Qwik City)

## Background
You are building a data table page for an internal product catalog using the **Qwik / Qwik City** framework. The catalog data lives in a **local SQLite database** and must be queried on the server. The page must be fully driven by the URL query string: the URL is the single source of truth, so that any page/sort/search state is shareable and survives a full reload. All rendering of the current page of data happens on the server via a `routeLoader$`.

A pre-scaffolded, dependency-installed Qwik City application is already available at the project path below. A canonical dataset is provided as a JSON file that you must load into a local SQLite database.

## Requirements
Implement a route at `/products` that renders an HTML table of products and supports pagination, sorting, and searching, all driven by URL query parameters:
- **Pagination**: `page` (1-based) and `pageSize` control which slice of matching rows is shown.
- **Sorting**: `sort` selects the column and `dir` selects the direction; clickable column headers toggle sort direction.
- **Searching**: `q` filters rows by a case-insensitive substring match on the product name; the search box is debounced and updates the URL.
- The server-side loader must read these parameters from the request URL and query the local SQLite database (using `WHERE` / `ORDER BY` / `LIMIT` / `OFFSET`), returning the current page of rows plus the total count of matching rows.

## Implementation Hints
- Project path: `/home/user/app`
- The dataset is provided at `/home/user/app/data/products.json` as an array of objects, each with the keys `id`, `name`, `category`, `price`, `stock`. Load this data into a local SQLite database and query it from the server. Do not filter/sort/paginate a plain in-memory JavaScript array — the data must come from SQLite.
- Use a Qwik City `routeLoader$` (server-only) to read the query parameters from the request URL and run the SQL query. Use `better-sqlite3` for database access (already installed). Keep all database code inside server-only boundaries so it never leaks into the client bundle.
- Use `<Link>` / `useNavigate` so that changing page, sort, or search updates the URL query string; the loader re-runs on navigation and re-queries SQLite.
- The search input must be **debounced** (about 300ms) on the client before it updates the `q` query parameter.
- Query parameter semantics (defaults apply when a parameter is absent):
  - `q`: search term, case-insensitive substring match against the product `name`. Default: empty (no filtering).
  - `sort`: one of `name`, `category`, `price`, `stock`. Default: `name`.
  - `dir`: one of `asc`, `desc`. Default: `asc`.
  - `page`: 1-based page number. Default: `1`.
  - `pageSize`: number of rows per page. Default: `10`.
- Rendering / output-shape requirements (the tests assert on these exact strings and on product names):
  - Render an HTML `<table>` where each row of the current page displays the product's `name`, `category`, `price`, and `stock`. Product names must appear verbatim in the HTML so a specific row can be located.
  - Somewhere on the page, render the total number of matching products as the text `Total: <n>` (for example `Total: 24`).
  - Somewhere on the page, render the pagination position as the text `Page <page> of <totalPages>`, where `totalPages` = ceil(total / pageSize).
  - Provide clickable, sortable column headers for Name, Category, Price, and Stock. Clicking a header sorts by that column; clicking the currently-active column toggles `dir` between `asc` and `desc`.
  - Provide pagination controls including a Previous and a Next control that move between pages by updating the `page` query parameter.
  - Provide a search text input (debounced) that updates the `q` query parameter.
- Start command (run from `/home/user/app`): `npm run dev -- --port 3000 --host 0.0.0.0`
- Port: 3000
- Route to verify: `http://localhost:3000/products`

