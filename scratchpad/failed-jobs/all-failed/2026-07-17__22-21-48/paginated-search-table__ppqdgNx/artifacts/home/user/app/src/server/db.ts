// Server-only database module.
// This file must never be imported into client code. It is only referenced from
// inside `routeLoader$` / `server$` boundaries, which Qwik extracts into the
// server bundle, so `better-sqlite3` (a native addon) never leaks to the client.
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
};

let db: Database.Database | null = null;

/**
 * Returns a singleton in-memory SQLite database pre-loaded with the canonical
 * product dataset. The data is read from `data/products.json` relative to the
 * project root (the cwd when the dev server starts).
 */
export function getDb(): Database.Database {
  if (db) return db;

  const instance = new Database(":memory:");
  instance.exec(`
    CREATE TABLE products (
      id    INTEGER PRIMARY KEY,
      name  TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL
    );
  `);

  const dataPath = join(process.cwd(), "data", "products.json");
  const rows = JSON.parse(readFileSync(dataPath, "utf-8")) as Product[];

  const insert = instance.prepare(
    "INSERT INTO products (id, name, category, price, stock) VALUES (?, ?, ?, ?, ?)",
  );
  const insertAll = instance.transaction((items: Product[]) => {
    for (const r of items) {
      insert.run(r.id, r.name, r.category, r.price, r.stock);
    }
  });
  insertAll(rows);

  db = instance;
  return instance;
}