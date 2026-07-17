/**
 * Server-only SQLite cart store.
 *
 * This module must never be imported by client-side code. It is referenced
 * exclusively from inside `server$()` RPC functions so the optimizer keeps
 * `better-sqlite3` out of the client bundle.
 */
import Database from "better-sqlite3";
import type { Database as DatabaseType, Statement } from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

export interface Product {
  id: string;
  name: string;
  price: number;
}

export const PRODUCTS: readonly Product[] = [
  { id: "tshirt", name: "Qwik T-Shirt", price: 20.0 },
  { id: "stickers", name: "Sticker Pack", price: 5.0 },
  { id: "mug", name: "Coffee Mug", price: 12.5 },
];

export const PRODUCT_BY_ID: Readonly<Record<string, Product>> = Object.freeze(
  Object.fromEntries(PRODUCTS.map((p) => [p.id, p])),
);

export const SESSION_COOKIE = "cart_session_id";

export interface CartLine {
  productId: string;
  quantity: number;
}

let dbInstance: DatabaseType | null = null;

interface CartRow {
  product_id: string;
  quantity: number;
}

function getDb(): DatabaseType {
  if (dbInstance) return dbInstance;
  const dataDir = resolve(process.cwd(), "data");
  mkdirSync(dataDir, { recursive: true });
  const dbPath = resolve(dataDir, "cart.sqlite");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS cart_items (
      session_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      PRIMARY KEY (session_id, product_id)
    );
    CREATE INDEX IF NOT EXISTS idx_cart_items_session
      ON cart_items(session_id);
  `);
  dbInstance = db;
  return db;
}

function rowToLine(row: CartRow): CartLine {
  return { productId: row.product_id, quantity: row.quantity };
}

export function loadCart(sessionId: string): CartLine[] {
  const db = getDb();
  const stmt: Statement<[string]> = db.prepare(
    "SELECT product_id, quantity FROM cart_items WHERE session_id = ? ORDER BY product_id",
  );
  const rows = stmt.all(sessionId) as CartRow[];
  return rows.map(rowToLine);
}

export function addItem(sessionId: string, productId: string): CartLine[] {
  const db = getDb();
  db.prepare(
    `INSERT INTO cart_items (session_id, product_id, quantity)
     VALUES (?, ?, 1)
     ON CONFLICT(session_id, product_id)
     DO UPDATE SET quantity = quantity + 1`,
  ).run(sessionId, productId);
  return loadCart(sessionId);
}

export function updateQuantity(
  sessionId: string,
  productId: string,
  delta: number,
): CartLine[] {
  const db = getDb();
  const tx = db.transaction(() => {
    const row = db
      .prepare(
        "SELECT quantity FROM cart_items WHERE session_id = ? AND product_id = ?",
      )
      .get(sessionId, productId) as CartRow | undefined;
    if (!row) return;
    const next = row.quantity + delta;
    if (next <= 1) {
      db.prepare(
        "UPDATE cart_items SET quantity = 1 WHERE session_id = ? AND product_id = ?",
      ).run(sessionId, productId);
    } else {
      db.prepare(
        "UPDATE cart_items SET quantity = ? WHERE session_id = ? AND product_id = ?",
      ).run(next, sessionId, productId);
    }
  });
  tx();
  return loadCart(sessionId);
}

export function removeItem(sessionId: string, productId: string): CartLine[] {
  const db = getDb();
  db.prepare(
    "DELETE FROM cart_items WHERE session_id = ? AND product_id = ?",
  ).run(sessionId, productId);
  return loadCart(sessionId);
}

export function generateSessionId(): string {
  // Prefer the standard WebCrypto API; fall back to Node's crypto for safety.
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require("node:crypto") as typeof import("node:crypto");
  return nodeCrypto.randomUUID();
}

export function getOrCreateSessionId(cookieValue: string | undefined): string {
  if (cookieValue && cookieValue.length > 0) return cookieValue;
  return generateSessionId();
}