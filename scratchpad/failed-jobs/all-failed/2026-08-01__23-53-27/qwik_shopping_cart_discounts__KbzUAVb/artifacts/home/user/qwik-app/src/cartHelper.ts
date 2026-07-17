import { getDb } from "./db";

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export interface Coupon {
  code: string;
  type: "PERCENT" | "FIXED" | "BOGO";
  value: number;
  minSpend: number;
}

export interface CartState {
  items: CartItem[];
  subtotal: number;
  coupon: Coupon | null;
  discount: number;
  total: number;
  error: string | null;
}

export function getCartState(customError: string | null = null): CartState {
  const db = getDb();

  // Fetch cart items
  const dbItems = db.prepare(`
    SELECT ci.productId, p.name, p.price, ci.quantity
    FROM CartItem ci
    JOIN Product p ON ci.productId = p.id
    ORDER BY ci.productId ASC
  `).all() as { productId: number; name: string; price: number; quantity: number }[];

  const items: CartItem[] = dbItems.map((item) => ({
    productId: item.productId,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    total: Math.round(item.price * item.quantity * 100) / 100,
  }));

  // Calculate subtotal
  const subtotal = Math.round(items.reduce((sum, item) => sum + item.total, 0) * 100) / 100;

  // Fetch active coupon
  const activeCouponDb = db.prepare(`
    SELECT ac.code, c.type, c.value, c.minSpend
    FROM ActiveCoupon ac
    JOIN Coupon c ON ac.code = c.code
  `).get() as { code: string; type: string; value: number; minSpend: number } | undefined;

  let coupon: Coupon | null = null;
  let discount = 0;
  let error = customError;

  if (activeCouponDb) {
    // Validate minSpend
    if (subtotal < activeCouponDb.minSpend) {
      // Automatically remove active coupon from the database
      db.prepare("DELETE FROM ActiveCoupon").run();
      error = "Minimum spend not met";
    } else {
      coupon = {
        code: activeCouponDb.code,
        type: activeCouponDb.type as "PERCENT" | "FIXED" | "BOGO",
        value: activeCouponDb.value,
        minSpend: activeCouponDb.minSpend,
      };
    }
  }

  // Calculate discount
  if (coupon) {
    if (coupon.type === "PERCENT") {
      discount = Math.round(subtotal * (coupon.value / 100) * 100) / 100;
    } else if (coupon.type === "FIXED") {
      discount = Math.min(subtotal, coupon.value);
    } else if (coupon.type === "BOGO") {
      const targetProductId = Math.round(coupon.value);
      const targetItem = items.find((item) => item.productId === targetProductId);
      if (targetItem) {
        const freeQuantity = Math.floor(targetItem.quantity / 2);
        discount = Math.round(freeQuantity * targetItem.price * 100) / 100;
      }
    }
  }

  const total = Math.round((subtotal - discount) * 100) / 100;

  return {
    items,
    subtotal,
    coupon,
    discount,
    total,
    error: error || null,
  };
}
