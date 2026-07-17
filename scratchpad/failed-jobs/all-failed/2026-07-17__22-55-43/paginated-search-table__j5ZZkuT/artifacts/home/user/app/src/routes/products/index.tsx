import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import {
  routeLoader$,
  useLocation,
  useNavigate,
  Link,
  type DocumentHead,
} from "@builder.io/qwik-city";
import {
  queryProducts,
  ALLOWED_SORT_COLUMNS,
  type SortColumn,
  type SortDir,
} from "~/lib/db";

export const useProductsLoader = routeLoader$((requestEvent) => {
  const url = requestEvent.url;

  const q = url.searchParams.get("q") ?? "";

  const sortParam = url.searchParams.get("sort") ?? "name";
  const sort: SortColumn = (
    ALLOWED_SORT_COLUMNS as readonly string[]
  ).includes(sortParam)
    ? (sortParam as SortColumn)
    : "name";

  const dirParam = url.searchParams.get("dir") ?? "asc";
  const dir: SortDir = dirParam === "desc" ? "desc" : "asc";

  const pageParam = parseInt(url.searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const pageSizeParam = parseInt(url.searchParams.get("pageSize") ?? "10", 10);
  const pageSize =
    Number.isFinite(pageSizeParam) && pageSizeParam > 0 ? pageSizeParam : 10;

  const { rows, total } = queryProducts({ q, sort, dir, page, pageSize });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return { rows, total, totalPages, q, sort, dir, page, pageSize };
});

export default component$(() => {
  const data = useProductsLoader();
  const loc = useLocation();
  const nav = useNavigate();

  const searchTerm = useSignal(data.value.q);

  // Debounce the search box: wait ~300ms after the user stops typing before
  // pushing the new `q` value into the URL (which re-runs the loader).

  useVisibleTask$(({ track, cleanup }) => {
    const value = track(() => searchTerm.value);

    const timer = setTimeout(() => {
      const url = new URL(loc.url);

      if (value) {
        url.searchParams.set("q", value);
      } else {
        url.searchParams.delete("q");
      }
      url.searchParams.set("page", "1");

      nav(`${url.pathname}${url.search}`);
    }, 300);

    cleanup(() => clearTimeout(timer));
  });

  const buildUrl = (
    overrides: Record<string, string | number | undefined>,
  ) => {
    const url = new URL(loc.url);
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined || value === "") {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, String(value));
      }
    }
    return `${url.pathname}${url.search}`;
  };

  const sortHeader = (column: SortColumn, label: string) => {
    const isActive = data.value.sort === column;
    const nextDir: SortDir = isActive && data.value.dir === "asc" ? "desc" : "asc";
    const indicator = isActive ? (data.value.dir === "asc" ? " ▲" : " ▼") : "";

    return (
      <th>
        <Link href={buildUrl({ sort: column, dir: nextDir, page: 1 })}>
          {label}
          {indicator}
        </Link>
      </th>
    );
  };

  const prevPage = Math.max(1, data.value.page - 1);
  const nextPage = Math.min(data.value.totalPages, data.value.page + 1);

  return (
    <div>
      <h1>Products</h1>

      <div>
        <input
          type="text"
          placeholder="Search by name..."
          value={searchTerm.value}
          onInput$={(_, el) => {
            searchTerm.value = el.value;
          }}
        />
      </div>

      <p>Total: {data.value.total}</p>

      <table>
        <thead>
          <tr>
            {sortHeader("name", "Name")}
            {sortHeader("category", "Category")}
            {sortHeader("price", "Price")}
            {sortHeader("stock", "Stock")}
          </tr>
        </thead>
        <tbody>
          {data.value.rows.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.category}</td>
              <td>{row.price}</td>
              <td>{row.stock}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        <Link
          href={buildUrl({ page: prevPage })}
          aria-disabled={data.value.page <= 1}
        >
          Previous
        </Link>{" "}
        <span>
          Page {data.value.page} of {data.value.totalPages}
        </span>{" "}
        <Link
          href={buildUrl({ page: nextPage })}
          aria-disabled={data.value.page >= data.value.totalPages}
        >
          Next
        </Link>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Products",
};
