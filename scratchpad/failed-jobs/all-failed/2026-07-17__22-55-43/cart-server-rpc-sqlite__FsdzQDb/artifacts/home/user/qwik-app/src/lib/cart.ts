import { server$ } from "@builder.io/qwik-city";
import type { RequestEventBase } from "@builder.io/qwik-city";
import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { getProduct } from "./catalog";

const SESSION_COOKIE = "cart_session_id";

export interface CartLine {
  productId: string;
  quantity: number;
}

/**
 * Reads the session id cookie, if present. Does NOT create one, since a
 * plain "get cart" call should not have side effects for a brand new visitor
 * (they simply have an empty cart until they perform their first write).
 */
function readSessionId(requestEvent: RequestEventBase): string | null {
  const existing = requestEvent.cookie.get(SESSION_COOKIE);
  return existing ? existing.value : null;
}

/**
 * Reads the session id cookie, creating (and persisting via Set-Cookie) a
 * new one on the first write if it is absent.
 */
function getOrCreateSessionId(requestEvent: RequestEventBase): string {
  const existing = requestEvent.cookie.get(SESSION_COOKIE);
  if (existing) {
    return existing.value;
  }
  const sessionId = randomUUID();
  requestEvent.cookie.set(SESSION_COOKIE, sessionId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });
  return sessionId;
}

function loadCart(sessionId: string): CartLine[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT product_id as productId, quantity FROM cart_items WHERE session_id = ? ORDER BY rowid ASC",
    )
    .all(sessionId) as CartLine[];
  return rows;
}

/** Fetch the current visitor's cart. Safe to call even if no session exists yet. */
export const getCart = server$(function (this: RequestEventBase) {
  const sessionId = readSessionId(this);
  if (!sessionId) {
    return [] as CartLine[];
  }
  return loadCart(sessionId);
});

/** Add a product to the cart, incrementing quantity if it's already present. */
export const addToCart = server$(function (
  this: RequestEventBase,
  productId: string,
) {
  const product = getProduct(productId);
  if (!product) {
    throw new Error(`Unknown product id: ${productId}`);
  }

  const sessionId = getOrCreateSessionId(this);
  const db = getDb();

  const existing = db
    .prepare(
      "SELECT quantity FROM cart_items WHERE session_id = ? AND product_id = ?",
    )
    .get(sessionId, productId) as { quantity: number } | undefined;

  if (existing) {
    db.prepare(
      "UPDATE cart_items SET quantity = quantity + 1 WHERE session_id = ? AND product_id = ?",
    ).run(sessionId, productId);
  } else {
    db.prepare(
      "INSERT INTO cart_items (session_id, product_id, quantity) VALUES (?, ?, 1)",
    ).run(sessionId, productId);
  }

  return loadCart(sessionId);
});

/** Change a cart line's quantity by `delta` (e.g. +1 / -1), never below 1. */
export const updateQuantity = server$(function (
  this: RequestEventBase,
  productId: string,
  delta: number,
) {
  const sessionId = getOrCreateSessionId(this);
  const db = getDb();

  const existing = db
    .prepare(
      "SELECT quantity FROM cart_items WHERE session_id = ? AND product_id = ?",
    )
    .get(sessionId, productId) as { quantity: number } | undefined;

  if (existing) {
    const nextQuantity = Math.max(1, existing.quantity + delta);
    db.prepare(
      "UPDATE cart_items SET quantity = ? WHERE session_id = ? AND product_id = ?",
    ).run(nextQuantity, sessionId, productId);
  }

  return loadCart(sessionId);
});

/** Remove a line entirely from the cart. */
export const removeFromCart = server$(function (
  this: RequestEventBase,
  productId: string,
) {
  const sessionId = getOrCreateSessionId(this);
  const db = getDb();

  db.prepare(
    "DELETE FROM cart_items WHERE session_id = ? AND product_id = ?",
  ).run(sessionId, productId);

  return loadCart(sessionId);
});
