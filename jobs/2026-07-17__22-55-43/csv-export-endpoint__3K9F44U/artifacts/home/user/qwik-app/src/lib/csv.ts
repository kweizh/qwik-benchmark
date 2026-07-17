import type { Transaction } from "./db";

const CSV_HEADER = "id,date,category,description,amount";

/**
 * Escapes a single CSV field per RFC 4180: if the value contains a comma,
 * a double quote, or a newline (CR or LF), it is wrapped in double quotes
 * and any internal double quotes are doubled.
 */
export function csvField(value: string | number): string {
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts a list of transactions into an RFC 4180 compliant CSV string,
 * using CRLF as the record separator.
 */
export function transactionsToCsv(rows: Transaction[]): string {
  const lines = rows.map((row) =>
    [row.id, row.date, row.category, row.description, row.amount]
      .map(csvField)
      .join(","),
  );

  return [CSV_HEADER, ...lines].map((line) => line).join("\r\n") + "\r\n";
}
