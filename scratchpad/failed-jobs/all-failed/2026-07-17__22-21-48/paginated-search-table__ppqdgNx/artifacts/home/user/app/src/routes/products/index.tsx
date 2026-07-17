import { component$, useStore } from "@builder.io/qwik";
import {
  routeLoader$,
  Link,
  useNavigate,
  useLocation,
  type DocumentHead,
} from "@builder.io/qwik-city";
import type { Product } from "~/server/db";

export const useProducts = routeLoader$(async (ev) => {
  // Dynamic import keeps `better-sqlite3` strictly server-side.
  const { getDb } = await import("../../server/db");

  const sp = ev.url.searchParams;

  // --- parse & validate query parameters (defaults when absent) ---
  const q = sp.get("q") ?? "";

  const sortParam = sp.get("sort");
  const sort =
    sortParam && ["name", "category", "price", "stock"].includes(sortParam)
      ? sortParam
      : "name";

  const dirParam = sp.get("dir");
  const dir = dirParam === "desc" ? "desc" : "asc";

  const pageRaw = parseInt(sp.get("page") ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const pageSizeRaw = parseInt(sp.get("pageSize") ?? "10", 10);
  const pageSize =
    Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? pageSizeRaw : 10;

  // --- query SQLite ---
  const db = getDb();
  const like = `%${q}%`;

  const totalRow = db
    .prepare(
      "SELECT COUNT(*) AS c FROM products WHERE name LIKE ? COLLATE NOCASE",
    )
    .get(like) as { c: number };
  const total = totalRow.c;

  // `sort` and `dir` are drawn from a fixed whitelist, so interpolation is safe.
  const rows = db
    .prepare(
      `SELECT id, name, category, price, stock
       FROM products
       WHERE name LIKE ? COLLATE NOCASE
       ORDER BY ${sort} ${dir}
       LIMIT ? OFFSET ?`,
    )
    .all(like, pageSize, (page - 1) * pageSize) as Product[];

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return { rows, total, page, pageSize, totalPages, q, sort, dir };
});

export default component$(() => {
  const data = useProducts();
  const loc = useLocation();
  const nav = useNavigate();

  // The loader exposes a ReadonlySignal; read its current value.
  const d = data.value;

  // Local state for the (debounced) search input.
  const search = useStore({
    q: d.q,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
  });

  // Build a /products URL with the given query-parameter overrides, preserving
  // any other currently-applied params.
  const buildHref = (overrides: Record<string, string | number>) => {
    const params = new URLSearchParams(loc.url.searchParams);
    for (const key of Object.keys(overrides)) {
      params.set(key, String(overrides[key]));
    }
    return `/products?${params.toString()}`;
  };

  const sortHref = (col: string) => {
    if (col === d.sort) {
      // Toggle direction on the active column.
      return buildHref({
        sort: col,
        dir: d.dir === "asc" ? "desc" : "asc",
        page: 1,
      });
    }
    return buildHref({ sort: col, dir: "asc", page: 1 });
  };

  const sortArrow = (col: string) => {
    if (col !== d.sort) return "";
    return d.dir === "asc" ? " ▲" : " ▼";
  };

  return (
    <main style={{ "max-width": "960px", margin: "0 auto", padding: "1rem" }}>
      <h1>Products</h1>

      {/* Search box (debounced ~300ms before updating the URL) */}
      <div style={{ "margin-bottom": "1rem" }}>
        <input
          type="search"
          placeholder="Search products by name..."
          value={search.q}
          onInput$={(e) => {
            const val = (e.target as HTMLInputElement).value;
            search.q = val;
            if (search.timer) clearTimeout(search.timer);
            search.timer = setTimeout(() => {
              const params = new URLSearchParams(loc.url.searchParams);
              params.set("q", val);
              params.set("page", "1");
              nav(`/products?${params.toString()}`);
            }, 300);
          }}
          aria-label="Search products"
        />
      </div>

      {/* Summary: total matching + page position */}
      <div style={{ "margin-bottom": "0.5rem" }}>
        <span>{`Total: ${d.total}`}</span>
      </div>
      <div style={{ "margin-bottom": "1rem" }}>
        <span>{`Page ${d.page} of ${d.totalPages}`}</span>
      </div>

      {/* Data table with sortable headers */}
      <table
        border={1}
        cellPadding={6}
        style={{ "border-collapse": "collapse", width: "100%" }}
      >
        <thead>
          <tr>
            <th>
              <Link href={sortHref("name")}>Name{sortArrow("name")}</Link>
            </th>
            <th>
              <Link href={sortHref("category")}>
                Category{sortArrow("category")}
              </Link>
            </th>
            <th>
              <Link href={sortHref("price")}>Price{sortArrow("price")}</Link>
            </th>
            <th>
              <Link href={sortHref("stock")}>Stock{sortArrow("stock")}</Link>
            </th>
          </tr>
        </thead>
        <tbody>
          {d.rows.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.category}</td>
              <td>{row.price.toFixed(2)}</td>
              <td>{row.stock}</td>
            </tr>
          ))}
          {d.rows.length === 0 && (
            <tr>
              <td colSpan={4} style={{ "text-align": "center" }}>
                No products found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination controls */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          "align-items": "center",
          "margin-top": "1rem",
        }}
      >
        {d.page > 1 ? (
          <Link href={buildHref({ page: d.page - 1 })}>Previous</Link>
        ) : (
          <span style={{ opacity: 0.5 }}>Previous</span>
        )}
        <span>{`Page ${d.page} of ${d.totalPages}`}</span>
        {d.page < d.totalPages ? (
          <Link href={buildHref({ page: d.page + 1 })}>Next</Link>
        ) : (
          <span style={{ opacity: 0.5 }}>Next</span>
        )}
      </div>
    </main>
  );
});

export const head: DocumentHead = {
  title: "Products",
  meta: [{ name: "description", content: "Product catalog table" }],
};