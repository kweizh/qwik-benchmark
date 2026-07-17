import { component$, useSignal, useTask$, $ } from "@builder.io/qwik";
import {
  routeLoader$,
  Link,
  useNavigate,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { queryProducts, type Product } from "~/lib/db";

const VALID_SORTS = new Set(["name", "category", "price", "stock"]);
const VALID_DIRS = new Set(["asc", "desc"]);

export const useProductsData = routeLoader$(async (event) => {
  const sp = event.url.searchParams;
  const q = sp.get("q") ?? "";
  const sortRaw = sp.get("sort") ?? "name";
  const dirRaw = sp.get("dir") ?? "asc";
  const pageRaw = sp.get("page") ?? "1";
  const pageSizeRaw = sp.get("pageSize") ?? "10";

  const sort = VALID_SORTS.has(sortRaw) ? sortRaw : "name";
  const dir = VALID_DIRS.has(dirRaw) ? dirRaw : "asc";
  const pageSizeRawNum = Number(pageSizeRaw);
  const pageSize = Number.isFinite(pageSizeRawNum)
    ? Math.min(100, Math.max(1, Math.floor(pageSizeRawNum)))
    : 10;
  const pageRawNum = Number(pageRaw);
  const page = Number.isFinite(pageRawNum)
    ? Math.max(1, Math.floor(pageRawNum))
    : 1;

  const { rows, total } = await queryProducts({
    q,
    sort,
    dir,
    page,
    pageSize,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages,
    sort,
    dir,
    q,
  };
});

function buildHref(
  current: {
    q: string;
    sort: string;
    dir: string;
    page: number;
    pageSize: number;
  },
  overrides: Partial<{
    q: string | null;
    sort: string;
    dir: string;
    page: number | null;
    pageSize: number;
  }> = {},
): string {
  const params = new URLSearchParams();
  const finalQ = overrides.q === null ? "" : overrides.q ?? current.q;
  const finalSort = overrides.sort ?? current.sort;
  const finalDir = overrides.dir ?? current.dir;
  const finalPage =
    overrides.page === null ? 1 : overrides.page ?? current.page;
  const finalPageSize = overrides.pageSize ?? current.pageSize;

  if (finalQ) params.set("q", finalQ);
  if (finalSort && finalSort !== "name") params.set("sort", finalSort);
  if (finalDir && finalDir !== "asc") params.set("dir", finalDir);
  if (finalPage && finalPage !== 1) params.set("page", String(finalPage));
  if (finalPageSize && finalPageSize !== 10) {
    params.set("pageSize", String(finalPageSize));
  }

  const qs = params.toString();
  return qs ? `/products?${qs}` : "/products";
}

export default component$(() => {
  const data = useProductsData();
  const nav = useNavigate();
  const searchInput = useSignal(data.value.q);

  // Debounce the search input (~300ms) and update only the `q` query param.
  // Other state (sort/dir/page) is preserved.
  useTask$(({ track, cleanup }) => {
    const v = track(() => searchInput.value);
    if (typeof window === "undefined") return;
    if (v === data.value.q) return;

    const handle = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (v) {
        params.set("q", v);
      } else {
        params.delete("q");
      }
      // Reset to page 1 for a new query so the user sees the first page
      // of matching results.
      params.set("page", "1");
      // Preserve sort/dir.
      params.set("sort", data.value.sort);
      params.set("dir", data.value.dir);
      const qs = params.toString();
      nav(qs ? `/products?${qs}` : "/products", { replaceState: true });
    }, 300);

    cleanup(() => clearTimeout(handle));
  });

  const { rows, total, page, totalPages, sort, dir, q } = data.value;

  return (
    <div class="products-page">
      <h1>Products</h1>

      <div class="toolbar">
        <input
          type="search"
          aria-label="Search products by name"
          placeholder="Search products by name..."
          value={searchInput.value}
          onInput$={(_, el) => {
            searchInput.value = (el as HTMLInputElement).value;
          }}
        />
        <noscript>
          <style
            dangerouslySetInnerHTML={`
              /* When JS is disabled, the search box still submits via Enter
                 so users have a way to filter. */
            `}
          />
        </noscript>
      </div>

      <p class="meta">
        <span>Total: {total}</span>{" "}
        <span>
          Page {page} of {totalPages}
        </span>
      </p>

      <table>
        <thead>
          <tr>
            <th>
              <Link
                href={buildHref(
                  { q, sort, dir, page, pageSize: data.value.pageSize },
                  {
                    sort: "name",
                    dir:
                      sort === "name" && dir === "asc" ? "desc" : "asc",
                    page: 1,
                  },
                )}
              >
                Name{sort === "name" ? (dir === "asc" ? " ▲" : " ▼") : ""}
              </Link>
            </th>
            <th>
              <Link
                href={buildHref(
                  { q, sort, dir, page, pageSize: data.value.pageSize },
                  {
                    sort: "category",
                    dir:
                      sort === "category" && dir === "asc"
                        ? "desc"
                        : "asc",
                    page: 1,
                  },
                )}
              >
                Category
                {sort === "category" ? (dir === "asc" ? " ▲" : " ▼") : ""}
              </Link>
            </th>
            <th>
              <Link
                href={buildHref(
                  { q, sort, dir, page, pageSize: data.value.pageSize },
                  {
                    sort: "price",
                    dir:
                      sort === "price" && dir === "asc" ? "desc" : "asc",
                    page: 1,
                  },
                )}
              >
                Price{sort === "price" ? (dir === "asc" ? " ▲" : " ▼") : ""}
              </Link>
            </th>
            <th>
              <Link
                href={buildHref(
                  { q, sort, dir, page, pageSize: data.value.pageSize },
                  {
                    sort: "stock",
                    dir:
                      sort === "stock" && dir === "asc" ? "desc" : "asc",
                    page: 1,
                  },
                )}
              >
                Stock{sort === "stock" ? (dir === "asc" ? " ▲" : " ▼") : ""}
              </Link>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p: Product) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.category}</td>
              <td>{p.price}</td>
              <td>{p.stock}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <nav class="pagination" aria-label="Pagination">
        {page > 1 ? (
          <Link
            href={buildHref(
              { q, sort, dir, page, pageSize: data.value.pageSize },
              { page: page - 1 },
            )}
            class="prev"
            rel="prev"
          >
            ‹ Previous
          </Link>
        ) : (
          <span class="prev disabled" aria-disabled="true">
            ‹ Previous
          </span>
        )}
        <span class="page-indicator">
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <Link
            href={buildHref(
              { q, sort, dir, page, pageSize: data.value.pageSize },
              { page: page + 1 },
            )}
            class="next"
            rel="next"
          >
            Next ›
          </Link>
        ) : (
          <span class="next disabled" aria-disabled="true">
            Next ›
          </span>
        )}
      </nav>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Products",
  meta: [
    {
      name: "description",
      content: "Browse, sort, search, and paginate the product catalog.",
    },
  ],
};
