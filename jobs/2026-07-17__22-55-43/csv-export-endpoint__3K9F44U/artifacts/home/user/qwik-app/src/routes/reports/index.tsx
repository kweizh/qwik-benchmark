import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getTransactions } from "~/lib/db";

export const useTransactions = routeLoader$(({ query }) => {
  const from = query.get("from") ?? undefined;
  const to = query.get("to") ?? undefined;
  const category = query.get("category") ?? undefined;

  const transactions = getTransactions({ from, to, category });

  return { from, to, category, transactions };
});

function buildExportHref(filters: {
  from?: string;
  to?: string;
  category?: string;
}): string {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.category) params.set("category", filters.category);
  const qs = params.toString();
  return `/reports/export${qs ? `?${qs}` : ""}`;
}

export default component$(() => {
  const data = useTransactions();
  const { from, to, category, transactions } = data.value;

  return (
    <>
      <h1>Transaction Report</h1>

      <form>
        <label>
          From
          <input type="date" name="from" value={from ?? ""} />
        </label>
        <label>
          To
          <input type="date" name="to" value={to ?? ""} />
        </label>
        <label>
          Category
          <input type="text" name="category" value={category ?? ""} />
        </label>
        <button type="submit">Filter</button>
      </form>

      <p>
        <a href={buildExportHref({ from, to, category })}>Download CSV</a>
      </p>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id}>
              <td>{t.id}</td>
              <td>{t.date}</td>
              <td>{t.category}</td>
              <td>{t.description}</td>
              <td>{t.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
});

export const head: DocumentHead = {
  title: "Transaction Report",
  meta: [
    {
      name: "description",
      content: "Filterable expense transaction report",
    },
  ],
};
