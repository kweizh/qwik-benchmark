import type { RequestHandler } from "@builder.io/qwik-city";
import {
  getTransactions,
  transactionsToCsv,
  type TransactionFilters,
} from "~/server/transactions";

/**
 * CSV export endpoint.
 *
 * Applies the same `from`, `to`, and `category` query-parameter filters as the
 * report page (identical semantics) and streams the matching rows as a
 * downloadable RFC 4180 CSV file.
 */
export const onGet: RequestHandler = async (event) => {
  const from = event.query.get("from") || undefined;
  const to = event.query.get("to") || undefined;
  const category = event.query.get("category") || undefined;

  const filters: TransactionFilters = {};
  if (from) filters.from = from;
  if (to) filters.to = to;
  if (category) filters.category = category;

  const rows = getTransactions(filters);
  const csv = transactionsToCsv(rows);

  const response = new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="transactions.csv"',
    },
  });

  event.send(response);
};