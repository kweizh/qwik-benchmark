import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";

/**
 * Server-only database access module.
 *
 * IMPORTANT: This module must only ever be imported from within
 * `routeLoader$`/`routeAction$`/`onGet` (etc.) closures so the Qwik
 * optimizer keeps `better-sqlite3` out of the client bundle.
 */

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

const dbPath = fileURLToPath(
  new URL("../../data/reports.db", import.meta.url),
);

let db: InstanceType<typeof Database> | undefined;

function getDb() {
  if (!db) {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
  }
  return db;
}

export function getTransactions(
  filters: TransactionFilters = {},
): Transaction[] {
  const conditions: string[] = [];
  const params: Record<string, string> = {};

  if (filters.from) {
    conditions.push("date >= @from");
    params.from = filters.from;
  }
  if (filters.to) {
    conditions.push("date <= @to");
    params.to = filters.to;
  }
  if (filters.category) {
    conditions.push("category = @category");
    params.category = filters.category;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT id, date, category, description, amount FROM transactions ${where} ORDER BY id ASC`;

  return getDb().prepare(sql).all(params) as Transaction[];
}
