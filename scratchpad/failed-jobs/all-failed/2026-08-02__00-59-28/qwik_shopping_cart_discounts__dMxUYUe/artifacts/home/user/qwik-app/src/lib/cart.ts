import { getDb } from "./db";

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export interface CouponInfo {
  code: string;
  type: "PERCENT" | "FIXED" | "BOGO";
  value: number;
  minSpend: number;
}

export interface CartState {
  items: CartItem[];
  subtotal: number;
  coupon: CouponInfo | null;
  discount: number;
  total: number;
  error: string | null;
}

export function getCartState(): CartState {
  const db = getDb();

  // Get cart items with product info, sorted by productId ascending
  const items = db
    .prepare(
      `SELECT c.productId, p.name, p.price, c.quantity
       FROM CartItem c
       JOIN Product p ON c.productId = p.id
       ORDER BY c.productId ASC`
    )
    .all() as Array<{ productId: number; name: string; price: number; quantity: number }>;

  const cartItems: CartItem[] = items.map((item) => ({
    productId: item.productId,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    total: Math.round(item.price * item.quantity * 100) / 100,
  }));

  const subtotal = Math.round(cartItems.reduce((sum, item) => sum + item.total, 0) * 100) / 100;

  // Get active coupon
  const activeCouponRow = db
    .prepare(
      `SELECT c.code, c.type, c.value, c.minSpend
       FROM ActiveCoupon a
       JOIN Coupon c ON a.code = c.code`
    )
    .get() as { code: string; type: string; value: number; minSpend: number } | undefined;

  let coupon: CouponInfo | null = null;
  let discount = 0;
  let error: string | null = null;

  if (activeCouponRow) {
    // Check minSpend
    if (subtotal < activeCouponRow.minSpend) {
      // Remove the active coupon since minSpend is no longer met
      db.prepare("DELETE FROM ActiveCoupon").run();
      error = "Minimum spend not met";
    } else {
      coupon = {
        code: activeCouponRow.code,
        type: activeCouponRow.type as "PERCENT" | "FIXED" | "BOGO",
        value: activeCouponRow.value,
        minSpend: activeCouponRow.minSpend,
      };
      discount = calculateDiscount(coupon, cartItems, subtotal);
    }
  }

  let total = Math.round((subtotal - discount) * 100) / 100;
  if (total < 0) total = 0;

  return {
    items: cartItems,
    subtotal,
    coupon,
    discount,
    total,
    error,
  };
}

function calculateDiscount(
  coupon: CouponInfo,
  items: CartItem[],
  subtotal: number
): number {
  switch (coupon.type) {
    case "PERCENT": {
      return Math.round(subtotal * (coupon.value / 100) * 100) / 100;
    }
    case "FIXED": {
      const discount = coupon.value;
      return Math.min(discount, subtotal); // cannot exceed subtotal
    }
    case "BOGO": {
      const targetProductId = coupon.value; // value stores the productId as a float
      const cartItem = items.find((item) => item.productId === targetProductId);
      if (!cartItem) return 0;
      const freeUnits = Math.floor(cartItem.quantity / 2);
      return Math.round(freeUnits * cartItem.price * 100) / 100;
    }
    default:
      return 0;
  }
}

export function updateCartItem(productId: number, quantity: number): CartState {
  const db = getDb();

  // Validate product exists
  const product = db.prepare("SELECT id FROM Product WHERE id = ?").get(productId);
  if (!product) {
    return getCartState();
  }

  if (quantity <= 0) {
    db.prepare("DELETE FROM CartItem WHERE productId = ?").run(productId);
  } else {
    db.prepare(
      "INSERT INTO CartItem (productId, quantity) VALUES (?, ?) ON CONFLICT(productId) DO UPDATE SET quantity = ?"
    ).run(productId, quantity, quantity);
  }

  // After cart modification, check if active coupon still meets minSpend
  return getCartState();
}

export function applyCoupon(code: string): CartState {
  const db = getDb();

  // Check if coupon exists
  const couponRow = db.prepare("SELECT code, type, value, minSpend FROM Coupon WHERE code = ?").get(code) as
    | { code: string; type: string; value: number; minSpend: number }
    | undefined;

  if (!couponRow) {
    // Clear any existing active coupon
    db.prepare("DELETE FROM ActiveCoupon").run();
    const state = getCartState();
    state.error = "Invalid coupon code";
    state.coupon = null;
    state.discount = 0;
    state.total = state.subtotal;
    return state;
  }

  // Check minSpend
  const cartItems = getCartItemsRaw();
  const subtotal = Math.round(cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;

  if (subtotal < couponRow.minSpend) {
    // Don't apply the coupon
    db.prepare("DELETE FROM ActiveCoupon").run();
    const state = getCartState();
    state.error = "Minimum spend not met";
    state.coupon = null;
    state.discount = 0;
    state.total = state.subtotal;
    return state;
  }

  // Apply the coupon (clear existing first since only one active)
  db.prepare("DELETE FROM ActiveCoupon").run();
  db.prepare("INSERT INTO ActiveCoupon (code) VALUES (?)").run(code);

  return getCartState();
}

function getCartItemsRaw(): Array<{ productId: number; price: number; quantity: number }> {
  const db = getDb();
  return db
    .prepare(
      `SELECT c.productId, p.price, c.quantity
       FROM CartItem c
       JOIN Product p ON c.productId = p.id`
    )
    .all() as Array<{ productId: number; price: number; quantity: number }>;
}

export function clearCart(): CartState {
  const db = getDb();
  db.prepare("DELETE FROM CartItem").run();
  db.prepare("DELETE FROM ActiveCoupon").run();
  return getCartState();
}
