/**
 * Server-only module for accessing the transactions SQLite database.
 *
 * This module imports `better-sqlite3` (a native Node addon) and must never
 * be imported from client-side code. It is only consumed from Qwik City
 * route loaders and request handlers, which are server-only boundaries.
 */
import Database from "better-sqlite3";
import { resolve } from "node:path";

export interface Transaction {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
}

export interface TransactionFilters {
  from?: string;
  to?: string;
  category?: string;
}

let dbInstance: Database.Database | null = null;

function getDb(): Database.Database {
  if (!dbInstance) {
    const dbPath = resolve(process.cwd(), "data", "reports.db");
    dbInstance = new Database(dbPath, { readonly: true });
  }
  return dbInstance;
}

/**
 * Returns the transactions matching the provided filters, ordered by `id`
 * ascending. Filters are combined with logical AND:
 *  - `from`:     date >= from  (inclusive)
 *  - `to`:       date <= to    (inclusive)
 *  - `category`: category == category (exact, case-sensitive)
 */
export function getTransactions(filters: TransactionFilters): Transaction[] {
  const conditions: string[] = [];
  const params: Record<string, string> = {};

  if (filters.from) {
    conditions.push("date >= :from");
    params.from = filters.from;
  }
  if (filters.to) {
    conditions.push("date <= :to");
    params.to = filters.to;
  }
  if (filters.category) {
    conditions.push("category = :category");
    params.category = filters.category;
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT id, date, category, description, amount
               FROM transactions
               ${where}
               ORDER BY id ASC`;

  return getDb().prepare(sql).all(params) as Transaction[];
}

/**
 * Escapes a single field for RFC 4180 CSV. If the field contains a comma,
 * double quote, or newline, it is wrapped in double quotes and any inner
 * double quotes are doubled.
 */
function escapeCsvField(value: string): string {
  const needsQuoting = /[",\r\n]/.test(value);
  if (needsQuoting) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Serializes an array of transactions into a RFC 4180 compliant CSV string.
 * - Header row: id,date,category,description,amount
 * - Records separated by CRLF (\r\n)
 * - amount written as its plain numeric value
 */
export function transactionsToCsv(transactions: Transaction[]): string {
  const header = "id,date,category,description,amount";
  const lines = [header];

  for (const t of transactions) {
    const row = [
      String(t.id),
      escapeCsvField(t.date),
      escapeCsvField(t.category),
      escapeCsvField(t.description),
      String(t.amount),
    ].join(",");
    lines.push(row);
  }

  return lines.join("\r\n");
}