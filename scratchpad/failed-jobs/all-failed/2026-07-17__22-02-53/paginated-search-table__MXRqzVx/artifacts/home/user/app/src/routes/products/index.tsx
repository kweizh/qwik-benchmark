import { component$, useSignal, useTask$ } from "@builder.io/qwik";
import { routeLoader$, useNavigate, useLocation, Link } from "@builder.io/qwik-city";
import { getDb, type Product } from "../../db";

export const useProductsLoader = routeLoader$(async ({ url }) => {
  const q = url.searchParams.get("q") || "";
  const sort = url.searchParams.get("sort") || "name";
  const dir = url.searchParams.get("dir") || "asc";
  const pageStr = url.searchParams.get("page") || "1";
  const pageSizeStr = url.searchParams.get("pageSize") || "10";

  // Validate parameters
  const allowedSortColumns = ["name", "category", "price", "stock"];
  const sortColumn = allowedSortColumns.includes(sort) ? sort : "name";
  const sortDir = dir === "desc" ? "desc" : "asc";

  let pageNum = parseInt(pageStr, 10);
  if (isNaN(pageNum) || pageNum < 1) {
    pageNum = 1;
  }

  let pageSizeNum = parseInt(pageSizeStr, 10);
  if (isNaN(pageSizeNum) || pageSizeNum < 1) {
    pageSizeNum = 10;
  }

  const db = getDb();
  const qPattern = `%${q}%`;

  // Get total matching count
  const countResult = db
    .prepare("SELECT COUNT(*) as count FROM products WHERE name LIKE ?")
    .get(qPattern) as { count: number };
  const total = countResult.count;

  // Get paginated rows
  const offset = (pageNum - 1) * pageSizeNum;
  const rows = db
    .prepare(`
      SELECT id, name, category, price, stock
      FROM products
      WHERE name LIKE ?
      ORDER BY ${sortColumn} ${sortDir}
      LIMIT ? OFFSET ?
    `)
    .all(qPattern, pageSizeNum, offset) as Product[];

  return {
    products: rows,
    total,
    page: pageNum,
    pageSize: pageSizeNum,
    sort: sortColumn,
    dir: sortDir,
    q,
  };
});

export default component$(() => {
  const loader = useProductsLoader();
  const loc = useLocation();
  const nav = useNavigate();

  const { products, total, page, pageSize, sort, dir, q } = loader.value;

  const totalPages = Math.ceil(total / pageSize) || 1;

  // Search input signal
  const searchInput = useSignal(q);

  // Helper to build URLs with updated search parameters
  const buildUrl = (updates: Record<string, string | number | undefined>) => {
    const newUrl = new URL(loc.url.href);
    for (const [key, val] of Object.entries(updates)) {
      if (val === undefined) {
        newUrl.searchParams.delete(key);
      } else {
        newUrl.searchParams.set(key, String(val));
      }
    }
    return newUrl.pathname + newUrl.search;
  };

  const getSortUrl = (column: string) => {
    let nextDir = "asc";
    if (sort === column) {
      nextDir = dir === "asc" ? "desc" : "asc";
    }
    return buildUrl({ sort: column, dir: nextDir, page: 1 });
  };

  // Debounce search input changes
  useTask$(({ track, cleanup }) => {
    const value = track(() => searchInput.value);
    if (value === q) {
      return;
    }
    const timer = setTimeout(() => {
      const newUrl = new URL(loc.url.href);
      if (value) {
        newUrl.searchParams.set("q", value);
      } else {
        newUrl.searchParams.delete("q");
      }
      newUrl.searchParams.set("page", "1"); // Reset to page 1 on search change
      nav(newUrl.pathname + newUrl.search);
    }, 300);
    cleanup(() => clearTimeout(timer));
  });

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Product Catalog</h1>

      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search products..."
          value={searchInput.value}
          onInput$={(e) => {
            searchInput.value = (e.target as HTMLInputElement).value;
          }}
          style={{
            padding: "8px 12px",
            fontSize: "16px",
            width: "300px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />
      </div>

      <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
        Total: {total}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
        <thead>
          <tr style={{ backgroundColor: "#f4f4f4", borderBottom: "2px solid #ccc" }}>
            <th style={{ textAlign: "left", padding: "10px", border: "1px solid #ddd" }}>
              <Link
                href={getSortUrl("name")}
                style={{
                  textDecoration: "none",
                  color: "#333",
                  display: "block",
                }}
              >
                Name {sort === "name" ? (dir === "asc" ? "▲" : "▼") : ""}
              </Link>
            </th>
            <th style={{ textAlign: "left", padding: "10px", border: "1px solid #ddd" }}>
              <Link
                href={getSortUrl("category")}
                style={{
                  textDecoration: "none",
                  color: "#333",
                  display: "block",
                }}
              >
                Category {sort === "category" ? (dir === "asc" ? "▲" : "▼") : ""}
              </Link>
            </th>
            <th style={{ textAlign: "left", padding: "10px", border: "1px solid #ddd" }}>
              <Link
                href={getSortUrl("price")}
                style={{
                  textDecoration: "none",
                  color: "#333",
                  display: "block",
                }}
              >
                Price {sort === "price" ? (dir === "asc" ? "▲" : "▼") : ""}
              </Link>
            </th>
            <th style={{ textAlign: "left", padding: "10px", border: "1px solid #ddd" }}>
              <Link
                href={getSortUrl("stock")}
                style={{
                  textDecoration: "none",
                  color: "#333",
                  display: "block",
                }}
              >
                Stock {sort === "stock" ? (dir === "asc" ? "▲" : "▼") : ""}
              </Link>
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "10px", border: "1px solid #ddd" }}>{product.name}</td>
              <td style={{ padding: "10px", border: "1px solid #ddd" }}>{product.category}</td>
              <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                {product.price}
              </td>
              <td style={{ padding: "10px", border: "1px solid #ddd" }}>{product.stock}</td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                No products found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
        {page > 1 ? (
          <Link
            href={buildUrl({ page: page - 1 })}
            style={{
              padding: "6px 12px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              textDecoration: "none",
              color: "#333",
              backgroundColor: "#fff",
            }}
          >
            Previous
          </Link>
        ) : (
          <span
            style={{
              padding: "6px 12px",
              border: "1px solid #eee",
              borderRadius: "4px",
              color: "#aaa",
              backgroundColor: "#fafafa",
              cursor: "not-allowed",
            }}
          >
            Previous
          </span>
        )}

        <span>
          Page {page} of {totalPages}
        </span>

        {page < totalPages ? (
          <Link
            href={buildUrl({ page: page + 1 })}
            style={{
              padding: "6px 12px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              textDecoration: "none",
              color: "#333",
              backgroundColor: "#fff",
            }}
          >
            Next
          </Link>
        ) : (
          <span
            style={{
              padding: "6px 12px",
              border: "1px solid #eee",
              borderRadius: "4px",
              color: "#aaa",
              backgroundColor: "#fafafa",
              cursor: "not-allowed",
            }}
          >
            Next
          </span>
        )}
      </div>
    </div>
  );
});
