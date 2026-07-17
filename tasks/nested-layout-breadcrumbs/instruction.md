# Qwik City Documentation Site with Nested Layouts & Auto Breadcrumbs

## Background
You are building a self-contained documentation browser using the **Qwik** framework and its meta-framework **Qwik City**. The site organizes docs into categories and pages using a multi-level nested routing structure. Each level has its own `layout.tsx`, and a breadcrumb trail plus a sidebar navigation are generated automatically from the current route rather than being hardcoded per page.

A pre-scaffolded Qwik City project already exists at the project path. It boots and builds as-is. A local data module has already been placed in the project and must be the single source of truth for all category/page titles — do NOT hardcode titles or fetch anything over the network.

## Provided Data Source
The file `src/data/docs.ts` is already present and exports a `categories` array with this shape:

```ts
export interface DocPage { slug: string; title: string; body: string; }
export interface DocCategory { slug: string; title: string; pages: DocPage[]; }
export const categories: DocCategory[];
```

Human-readable titles differ from the URL slugs (e.g. the slug `getting-started` has the title `Getting Started`). All breadcrumb and sidebar labels must be the resolved `title` values from this module, never the raw slugs.

## Requirements
- Implement a multi-level nested route tree under `/docs`:
  - `/docs` — lists all categories.
  - `/docs/[category]` — lists the pages in that category.
  - `/docs/[category]/[slug]` — renders a single page's title and body.
- Use **nested `layout.tsx` files** with `<Slot />` so shared UI (breadcrumb bar + sidebar) wraps every `/docs` route.
- Render an **automatically generated breadcrumb trail** derived from the current route segments and params. The trail always begins with a `Docs` crumb linking to `/docs`, followed by the category title, then the page title, depending on how deep the current route is. The final crumb represents the current page.
- Render a **sidebar navigation** listing every category as a link to its `/docs/<category>` route. The link matching the currently active category must be marked as the active route.
- Resolve all segment titles on the server from `src/data/docs.ts`, and use `useLocation` to read the current route.
- Handle **404**: requesting an unknown category or an unknown page slug must respond with HTTP status `404`.

## Implementation Hints
- Use `routeLoader$` (server side) to resolve titles from the local data module, and `useLocation()` to read the current path/params. Use `requestEvent.fail(404, ...)` (or an equivalent that sets the response status) to produce a 404 for unknown segments.
- Compose the breadcrumb and sidebar in the nested layouts using `<Slot />`; do not copy them into every page.
- Keep the data import server-only friendly (it is plain JSON-serializable data, so it can be resolved inside loaders).
- Project path: /home/user/qwik-docs
- The provided data module lives at /home/user/qwik-docs/src/data/docs.ts and must not be modified in a way that removes or renames existing categories/pages.
- Start command: npm run preview (the production preview server MUST listen on host 0.0.0.0 and port 3000).
- Port: 3000
- Routes and observable output shape:
  - The breadcrumb trail MUST be rendered inside a `<nav>` element carrying the attribute `aria-label="breadcrumb"`. Crumbs appear in hierarchical order and the labels are the resolved human titles.
  - The sidebar MUST be rendered inside a `<nav>` element carrying the attribute `aria-label="sidebar"`, containing one link per category (href `/docs/<category-slug>`) labeled with the category title.
  - The sidebar link for the currently active category MUST carry the attribute `aria-current="page"`.
  - `/docs/[category]/[slug]` MUST render the page's `title` and its `body` text.
  - Unknown category (e.g. `/docs/does-not-exist`) or unknown slug (e.g. `/docs/<valid-category>/does-not-exist`) MUST return HTTP status 404.

