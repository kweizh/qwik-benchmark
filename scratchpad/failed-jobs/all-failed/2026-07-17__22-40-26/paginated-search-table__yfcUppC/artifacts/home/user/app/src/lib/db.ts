// Server-only SQLite database wrapper for the products catalog.
// This module must only be imported from server-only code (e.g. inside a
// `routeLoader$`). It is intentionally not referenced from any client component.

import Database from "better-sqlite3";
import type { Database as DatabaseT } from "better-sqlite3";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
}

export interface QueryParams {
  q: string;
  sort: string;
  dir: string;
  page: number;
  pageSize: number;
}

export interface QueryResult {
  rows: Product[];
  total: number;
}

const VALID_SORTS = new Set(["name", "category", "price", "stock"]);
const VALID_DIRS = new Set(["asc", "desc"]);
const DEFAULT_SORT = "name";
const DEFAULT_DIR = "asc";
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

let dbInstance: DatabaseT | null = null;
let initPromise: Promise<DatabaseT> | null = null;

function dataPaths() {
  // Use the working directory because `npm run dev` is always started from
  // the project root (`/home/user/app`), where `data/products.json` lives.
  const dataDir = join(process.cwd(), "data");
  return {
    dataDir,
    dbPath: join(dataDir, "products.db"),
    jsonPath: join(dataDir, "products.json"),
  };
}

async function loadProducts(jsonPath: string): Promise<Product[]> {
  const raw = await readFileSync(jsonPath, "utf-8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("products.json must be an array");
  }
  return parsed as Product[];
}

async function initDatabase(): Promise<DatabaseT> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { dataDir, dbPath, jsonPath } = dataPaths();
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");

    db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        stock INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
      CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
    `);

    const countRow = db
      .prepare("SELECT COUNT(*) as c FROM products")
      .get() as { c: number };

    if (countRow.c === 0) {
      const products = await loadProducts(jsonPath);
      const insert = db.prepare(
        "INSERT INTO products (id, name, category, price, stock) VALUES (@id, @name, @category, @price, @stock)",
      );
      const insertMany = db.transaction((items: Product[]) => {
        for (const p of items) {
          insert.run({
            id: p.id,
            name: p.name,
            category: p.category,
            price: p.price,
            stock: p.stock,
          });
        }
      });
      insertMany(products);
    }

    dbInstance = db;
    return db;
  })();

  return initPromise;
}

async function getDb(): Promise<DatabaseT> {
  if (dbInstance) return dbInstance;
  return initDatabase();
}

export async function queryProducts(params: QueryParams): Promise<QueryResult> {
  const db = await getDb();

  const sort = VALID_SORTS.has(params.sort) ? params.sort : DEFAULT_SORT;
  const dir = VALID_DIRS.has(params.dir) ? params.dir : DEFAULT_DIR;
  const rawPage = Number.isFinite(params.page)
    ? Math.floor(params.page)
    : DEFAULT_PAGE;
  const page = Math.max(1, rawPage);
  const rawPageSize = Number.isFinite(params.pageSize)
    ? Math.floor(params.pageSize)
    : DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, rawPageSize));
  const offset = (page - 1) * pageSize;

  const whereClauses: string[] = [];
  const whereArgs: (string | number)[] = [];

  const trimmedQ = params.q ? params.q.trim() : "";
  if (trimmedQ) {
    whereClauses.push("LOWER(name) LIKE ?");
    whereArgs.push(`%${trimmedQ.toLowerCase()}%`);
  }

  const whereSql = whereClauses.length
    ? `WHERE ${whereClauses.join(" AND ")}`
    : "";
  const dirSql = dir === "asc" ? "ASC" : "DESC";
  // `sort` is whitelisted above so it is safe to interpolate as a column name.
  const orderSql = `ORDER BY ${sort} ${dirSql}`;

  const countSql = `SELECT COUNT(*) as c FROM products ${whereSql}`;
  const dataSql = `SELECT id, name, category, price, stock FROM products ${whereSql} ${orderSql} LIMIT ? OFFSET ?`;

  const countRow = db.prepare(countSql).get(...whereArgs) as { c: number };
  const rows = db
    .prepare(dataSql)
    .all(...whereArgs, pageSize, offset) as Product[];

  return {
    rows,
    total: countRow.c,
  };
}
