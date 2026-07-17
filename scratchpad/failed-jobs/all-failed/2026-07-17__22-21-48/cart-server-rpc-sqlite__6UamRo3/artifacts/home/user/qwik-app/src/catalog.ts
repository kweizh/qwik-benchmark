/**
 * Shared, client-safe catalog data and helpers.
 *
 * This module contains NO server-only imports (no `better-sqlite3`, no `node:*`)
 * so it is safe to bundle into the client. The cart *state* is never stored here;
 * only the fixed product catalog and pure formatting helpers live in this file.
 */

export interface Product {
  id: string;
  name: string;
  price: number;
}

/** A single line of the shopping cart. */
export interface CartItem {
  productId: string;
  quantity: number;
}

/** The fixed product catalog that the page renders. */
export const PRODUCTS: Product[] = [
  { id: "tshirt", name: "Qwik T-Shirt", price: 20.0 },
  { id: "stickers", name: "Sticker Pack", price: 5.0 },
  { id: "mug", name: "Coffee Mug", price: 12.5 },
];

/** Quick id -> product lookup. */
export const PRODUCT_MAP: Record<string, Product> = Object.fromEntries(
  PRODUCTS.map((p) => [p.id, p]),
);

/**
 * Format a monetary amount (in dollars) as `$X.XX` with exactly two decimals.
 * Computed from integer cents to avoid floating-point rounding surprises.
 */
export function formatPrice(dollars: number): string {
  const cents = Math.round(dollars * 100);
  return `$${(cents / 100).toFixed(2)}`;
}