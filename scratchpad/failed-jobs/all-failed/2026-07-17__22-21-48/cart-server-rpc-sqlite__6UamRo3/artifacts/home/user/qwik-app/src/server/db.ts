/**
 * Server-only SQLite persistence layer.
 *
 * IMPORTANT: This module imports `better-sqlite3` and uses `node:path`, so it
 * must NEVER be imported from the top level of a component module that is also
 * rendered in the browser. It is only ever loaded through dynamic `import()`
 * from inside `server$()` / `routeLoader$()` boundaries, which run exclusively
 * on the server.
 */
import path from "node:path";
import Database from "better-sqlite3";
import type { CartItem } from "../catalog";

/**
 * The SQLite database file lives inside the project directory so the cart
 * persists across server restarts and page reloads.
 */
const DB_PATH = path.join(process.cwd(), "cart.db");

const db = new Database(DB_PATH);
// WAL mode gives better concurrency and durability for a local file.
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS cart_items (
    session_id  TEXT NOT NULL,
    product_id  TEXT NOT NULL,
    quantity    INTEGER NOT NULL,
    PRIMARY KEY (session_id, product_id)
  )
`);

/** Read every cart line for a session, in insertion order. */
export function getCart(sessionId: string): CartItem[] {
  const rows = db
    .prepare(
      "SELECT product_id AS productId, quantity FROM cart_items WHERE session_id = ? ORDER BY rowid",
    )
    .all(sessionId) as Array<{ productId: string; quantity: number }>;
  return rows.map((r) => ({ productId: r.productId, quantity: r.quantity }));
}

/**
 * Add a product to the cart. If the product is already present, its quantity is
 * incremented by one instead of creating a duplicate line.
 */
export function addItem(sessionId: string, productId: string): void {
  db.prepare(
    `INSERT INTO cart_items (session_id, product_id, quantity)
     VALUES (?, ?, 1)
     ON CONFLICT(session_id, product_id)
     DO UPDATE SET quantity = cart_items.quantity + 1`,
  ).run(sessionId, productId);
}

/**
 * Change a cart line's quantity by `delta`. The quantity is clamped to a
 * minimum of 1 (the decrement button must never lower the quantity below 1).
 */
export function updateQty(sessionId: string, productId: string, delta: number): void {
  db.prepare(
    `UPDATE cart_items
       SET quantity = MAX(1, quantity + ?)
     WHERE session_id = ? AND product_id = ?`,
  ).run(delta, sessionId, productId);
}

/** Remove a product line entirely from the cart. */
export function removeItem(sessionId: string, productId: string): void {
  db.prepare(
    "DELETE FROM cart_items WHERE session_id = ? AND product_id = ?",
  ).run(sessionId, productId);
}