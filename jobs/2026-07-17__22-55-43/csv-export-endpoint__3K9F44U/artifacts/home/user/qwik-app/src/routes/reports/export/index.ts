import type { RequestHandler } from "@builder.io/qwik-city";
import { getTransactions } from "~/lib/db";
import { transactionsToCsv } from "~/lib/csv";

export const onGet: RequestHandler = async (requestEvent) => {
  const { query, send } = requestEvent;

  const from = query.get("from") ?? undefined;
  const to = query.get("to") ?? undefined;
  const category = query.get("category") ?? undefined;

  const transactions = getTransactions({ from, to, category });
  const csv = transactionsToCsv(transactions);

  requestEvent.headers.set("Content-Type", "text/csv; charset=utf-8");
  requestEvent.headers.set(
    "Content-Disposition",
    'attachment; filename="transactions.csv"',
  );

  send(200, csv);
};
