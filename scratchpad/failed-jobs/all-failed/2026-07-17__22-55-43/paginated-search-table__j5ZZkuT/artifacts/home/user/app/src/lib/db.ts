import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * This module is only ever imported from inside `routeLoader$` callbacks,
 * which are server-only QRL segments in Qwik City. As a result, none of
 * this code (including the `better-sqlite3` import) is included in the
 * client bundle.
 */

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
}

export type SortColumn = "name" | "category" | "price" | "stock";
export type SortDir = "asc" | "desc";

export const ALLOWED_SORT_COLUMNS: SortColumn[] = [
  "name",
  "category",
  "price",
  "stock",
];

export interface QueryOptions {
  q: string;
  sort: SortColumn;
  dir: SortDir;
  page: number;
  pageSize: number;
}

export interface QueryResult {
  rows: Product[];
  total: number;
}

let dbInstance: Database.Database | null = null;

function seedIfEmpty(instance: Database.Database) {
  const { count } = instance
    .prepare("SELECT COUNT(*) as count FROM products")
    .get() as { count: number };

  if (count > 0) return;

  const jsonPath = path.join(process.cwd(), "data", "products.json");
  const raw = fs.readFileSync(jsonPath, "utf-8");
  const products: Product[] = JSON.parse(raw);

  const insert = instance.prepare(
    `INSERT INTO products (id, name, category, price, stock)
     VALUES (@id, @name, @category, @price, @stock)`,
  );

  const insertMany = instance.transaction((items: Product[]) => {
    for (const item of items) insert.run(item);
  });

  insertMany(products);
}

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "products.sqlite");
  const instance = new Database(dbPath);
  instance.pragma("journal_mode = WAL");

  instance.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL
    )
  `);

  seedIfEmpty(instance);

  dbInstance = instance;
  return dbInstance;
}

export function queryProducts(options: QueryOptions): QueryResult {
  const database = getDb();

  const sort = ALLOWED_SORT_COLUMNS.includes(options.sort)
    ? options.sort
    : "name";
  const dir = options.dir === "desc" ? "DESC" : "ASC";
  const page = Math.max(1, Math.floor(options.page) || 1);
  const pageSize = Math.max(1, Math.floor(options.pageSize) || 10);
  const offset = (page - 1) * pageSize;

  const hasSearch = options.q.trim().length > 0;
  const whereClause = hasSearch ? "WHERE name LIKE @q ESCAPE '\\'" : "";

  const escapedQ = options.q
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");

  const params: Record<string, unknown> = hasSearch
    ? { q: `%${escapedQ}%` }
    : {};

  const totalRow = database
    .prepare(`SELECT COUNT(*) as count FROM products ${whereClause}`)
    .get(params) as { count: number };

  // Column name is validated against an allow-list above, so it is safe to
  // interpolate directly into the SQL string.
  const rows = database
    .prepare(
      `SELECT id, name, category, price, stock
       FROM products
       ${whereClause}
       ORDER BY ${sort} ${dir}
       LIMIT @limit OFFSET @offset`,
    )
    .all({ ...params, limit: pageSize, offset }) as Product[];

  return { rows, total: totalRow.count };
}
