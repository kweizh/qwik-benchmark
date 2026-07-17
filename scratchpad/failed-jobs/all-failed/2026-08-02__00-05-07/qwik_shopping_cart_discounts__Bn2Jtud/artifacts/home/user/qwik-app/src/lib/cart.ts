import { getDb } from "./db";

export type CouponType = "PERCENT" | "FIXED" | "BOGO";

export interface CouponRow {
  code: string;
  type: CouponType;
  value: number;
  minSpend: number;
}

export interface CartItemView {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export interface CartState {
  items: CartItemView[];
  subtotal: number;
  coupon: CouponRow | null;
  discount: number;
  total: number;
  error: string | null;
}

/** Round to 2 decimal places, avoiding floating point artifacts. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function getCartItemsWithProducts(): CartItemView[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT CartItem.productId AS productId,
              Product.name AS name,
              Product.price AS price,
              CartItem.quantity AS quantity
         FROM CartItem
         JOIN Product ON Product.id = CartItem.productId
        ORDER BY CartItem.productId ASC`,
    )
    .all() as {
    productId: number;
    name: string;
    price: number;
    quantity: number;
  }[];

  return rows.map((row) => ({
    productId: row.productId,
    name: row.name,
    price: row.price,
    quantity: row.quantity,
    total: round2(row.price * row.quantity),
  }));
}

function getActiveCoupon(): CouponRow | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT Coupon.code AS code,
              Coupon.type AS type,
              Coupon.value AS value,
              Coupon.minSpend AS minSpend
         FROM ActiveCoupon
         JOIN Coupon ON Coupon.code = ActiveCoupon.code
        LIMIT 1`,
    )
    .get() as CouponRow | undefined;

  return row ?? null;
}

function removeActiveCoupon(): void {
  const db = getDb();
  db.prepare("DELETE FROM ActiveCoupon").run();
}

function getProductPrice(productId: number): number | null {
  const db = getDb();
  const row = db
    .prepare("SELECT price FROM Product WHERE id = ?")
    .get(productId) as { price: number } | undefined;
  return row ? row.price : null;
}

/**
 * Computes the discount (in dollars) for a given coupon against the
 * provided cart items / subtotal. Does not perform any minSpend validation.
 */
function computeRawDiscount(
  coupon: CouponRow,
  subtotal: number,
  items: CartItemView[],
): number {
  switch (coupon.type) {
    case "PERCENT": {
      return subtotal * (coupon.value / 100);
    }
    case "FIXED": {
      return coupon.value;
    }
    case "BOGO": {
      const bogoProductId = Math.trunc(coupon.value);
      const item = items.find((i) => i.productId === bogoProductId);
      if (!item) {
        return 0;
      }
      const freeUnits = Math.floor(item.quantity / 2);
      const unitPrice = item.price;
      return freeUnits * unitPrice;
    }
    default:
      return 0;
  }
}

/**
 * Builds the full, authoritative cart state from the database. This is the
 * single source of truth used by both the GET/POST `/api/cart` endpoint and
 * the `/cart` UI route. All discount math & coupon validation happens here,
 * server-side, on every call.
 */
export function getCartState(): CartState {
  const items = getCartItemsWithProducts();
  const subtotal = round2(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );

  let coupon = getActiveCoupon();
  let discount = 0;
  let error: string | null = null;

  if (coupon) {
    if (subtotal < coupon.minSpend) {
      // The cart changed (or the coupon was applied) in a way that no
      // longer satisfies the coupon's minimum spend requirement. Invalidate
      // it in the database and surface the error to the caller.
      removeActiveCoupon();
      coupon = null;
      discount = 0;
      error = "Minimum spend not met";
    } else {
      const rawDiscount = computeRawDiscount(coupon, subtotal, items);
      const cappedTotal = Math.max(subtotal - rawDiscount, 0);
      discount = round2(subtotal - cappedTotal);
    }
  }

  const total = round2(Math.max(subtotal - discount, 0));

  return {
    items,
    subtotal,
    coupon,
    discount,
    total,
    error,
  };
}

export function updateCartItemQuantity(
  productId: number,
  quantity: number,
): CartState {
  const db = getDb();

  if (quantity <= 0) {
    db.prepare("DELETE FROM CartItem WHERE productId = ?").run(productId);
  } else {
    // Ensure the product exists before inserting a cart row for it.
    const price = getProductPrice(productId);
    if (price === null) {
      return { ...getCartState(), error: "Invalid product" };
    }

    db.prepare(
      `INSERT INTO CartItem (productId, quantity) VALUES (?, ?)
       ON CONFLICT(productId) DO UPDATE SET quantity = excluded.quantity`,
    ).run(productId, quantity);
  }

  return getCartState();
}

export function applyCoupon(code: string): CartState {
  const db = getDb();

  const coupon = db
    .prepare(
      "SELECT code, type, value, minSpend FROM Coupon WHERE code = ?",
    )
    .get(code) as CouponRow | undefined;

  if (!coupon) {
    return { ...getCartState(), error: "Invalid coupon code" };
  }

  const items = getCartItemsWithProducts();
  const subtotal = round2(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );

  if (subtotal < coupon.minSpend) {
    return { ...getCartState(), error: "Minimum spend not met" };
  }

  db.prepare("DELETE FROM ActiveCoupon").run();
  db.prepare("INSERT INTO ActiveCoupon (code) VALUES (?)").run(coupon.code);

  return getCartState();
}

export function clearCart(): CartState {
  const db = getDb();
  db.prepare("DELETE FROM CartItem").run();
  db.prepare("DELETE FROM ActiveCoupon").run();
  return getCartState();
}

export function listProducts(): { id: number; name: string; price: number }[] {
  const db = getDb();
  return db
    .prepare("SELECT id, name, price FROM Product ORDER BY id ASC")
    .all() as { id: number; name: string; price: number }[];
}
