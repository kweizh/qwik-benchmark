import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import {
  getTransactions,
  type Transaction,
  type TransactionFilters,
} from "~/server/transactions";

interface ReportData {
  rows: Transaction[];
  filters: TransactionFilters;
}

/**
 * Server-only route loader. Reads the current filter values from the URL
 * query string and queries the SQLite database for matching transactions.
 * Both the rows and the active filters are serialized into the initial
 * server-rendered HTML so the page can render the descriptions and build a
 * "Download CSV" link carrying the exact same filter values.
 */
export const useReport = routeLoader$(async (event): Promise<ReportData> => {
  const from = event.query.get("from") || undefined;
  const to = event.query.get("to") || undefined;
  const category = event.query.get("category") || undefined;

  const filters: TransactionFilters = {};
  if (from) filters.from = from;
  if (to) filters.to = to;
  if (category) filters.category = category;

  const rows = getTransactions(filters);
  return { rows, filters };
});

/**
 * Builds the export endpoint URL carrying the exact same filter values that
 * are currently applied to the page.
 */
function buildExportHref(filters: TransactionFilters): string {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.category) params.set("category", filters.category);
  const qs = params.toString();
  return qs ? `/reports/export?${qs}` : "/reports/export";
}

export default component$(() => {
  const report = useReport();
  const { rows, filters } = report.value;
  const exportHref = buildExportHref(filters);

  return (
    <div>
      <h1>Expense Reports</h1>

      <p>
        <a href={exportHref}>Download CSV</a>
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
          {rows.map((t) => (
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
    </div>
  );
});

export const head: DocumentHead = {
  title: "Expense Reports",
};