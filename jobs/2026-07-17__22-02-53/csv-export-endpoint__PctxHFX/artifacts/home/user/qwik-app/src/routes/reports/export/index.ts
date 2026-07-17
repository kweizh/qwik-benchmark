import type { RequestHandler } from "@builder.io/qwik-city";
import { getTransactions } from "../../../db";

export const onGet: RequestHandler = async ({ url, headers, send }) => {
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const category = url.searchParams.get("category");

  const transactions = getTransactions({ from, to, category });

  const formatCSVCell = (val: any): string => {
    if (val === null || val === undefined) {
      return "";
    }
    const str = String(val);
    const needsQuoting = str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r");
    if (needsQuoting) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headersRow = ["id", "date", "category", "description", "amount"].join(",");
  const rows = transactions.map((t) =>
    [
      formatCSVCell(t.id),
      formatCSVCell(t.date),
      formatCSVCell(t.category),
      formatCSVCell(t.description),
      formatCSVCell(t.amount),
    ].join(",")
  );

  const csvContent = [headersRow, ...rows].join("\r\n") + "\r\n";

  headers.set("Content-Type", "text/csv; charset=utf-8");
  headers.set("Content-Disposition", 'attachment; filename="transactions.csv"');

  send(200, csvContent);
};
