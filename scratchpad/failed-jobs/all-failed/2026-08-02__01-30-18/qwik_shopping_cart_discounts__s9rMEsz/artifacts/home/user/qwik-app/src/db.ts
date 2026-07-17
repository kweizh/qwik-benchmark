import Database from "better-sqlite3";

const DB_PATH = "/home/user/qwik-app/db.sqlite";

interface GlobalWithDb {
  _db?: Database.Database;
}

const g = globalThis as unknown as GlobalWithDb;

if (!g._db) {
  g._db = new Database(DB_PATH);
  g._db.pragma("foreign_keys = ON");
}

export const db = g._db!;

// Initialize schema and seed data
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS Product (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Coupon (
      code TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      value REAL NOT NULL,
      minSpend REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS CartItem (
      productId INTEGER PRIMARY KEY,
      quantity INTEGER NOT NULL,
      FOREIGN KEY(productId) REFERENCES Product(id)
    );

    CREATE TABLE IF NOT EXISTS ActiveCoupon (
      code TEXT PRIMARY KEY,
      FOREIGN KEY(code) REFERENCES Coupon(code)
    );
  `);

  // Seed products if empty
  const productCount = (db.prepare("SELECT COUNT(*) as count FROM Product").get() as any).count;
  if (productCount === 0) {
    const insertProduct = db.prepare("INSERT INTO Product (id, name, price) VALUES (?, ?, ?)");
    insertProduct.run(1, "Laptop", 999.99);
    insertProduct.run(2, "Wireless Mouse", 29.99);
    insertProduct.run(3, "Mechanical Keyboard", 79.99);
    insertProduct.run(4, "USB-C Cable", 9.99);
  }

  // Seed coupons if empty
  const couponCount = (db.prepare("SELECT COUNT(*) as count FROM Coupon").get() as any).count;
  if (couponCount === 0) {
    const insertCoupon = db.prepare("INSERT INTO Coupon (code, type, value, minSpend) VALUES (?, ?, ?, ?)");
    insertCoupon.run("SAVE10", "PERCENT", 10.0, 0.0);
    insertCoupon.run("SAVE20_MIN50", "PERCENT", 20.0, 50.0);
    insertCoupon.run("FLAT15", "FIXED", 15.0, 30.0);
    insertCoupon.run("BOGO2", "BOGO", 2.0, 0.0);
  }
}

// Call initDb upon import
initDb();

export interface CartItemResponse {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export interface CouponResponse {
  code: string;
  type: "PERCENT" | "FIXED" | "BOGO";
  value: number;
  minSpend: number;
}

export interface CartState {
  items: CartItemResponse[];
  subtotal: number;
  coupon: CouponResponse | null;
  discount: number;
  total: number;
  error: string | null;
}

export function getCartState(errorOverride: string | null = null): CartState {
  // 1. Get all items sorted by productId ascending
  const rows = db.prepare(`
    SELECT ci.productId, p.name, p.price, ci.quantity
    FROM CartItem ci
    JOIN Product p ON ci.productId = p.id
    ORDER BY ci.productId ASC
  `).all() as { productId: number; name: string; price: number; quantity: number }[];

  const items: CartItemResponse[] = rows.map((row) => ({
    productId: row.productId,
    name: row.name,
    price: row.price,
    quantity: row.quantity,
    total: Number((row.price * row.quantity).toFixed(2)),
  }));

  // 2. Calculate subtotal
  const subtotal = Number(items.reduce((sum, item) => sum + item.total, 0).toFixed(2));

  // 3. Get active coupon
  const activeCouponRow = db.prepare(`
    SELECT ac.code, c.type, c.value, c.minSpend
    FROM ActiveCoupon ac
    JOIN Coupon c ON ac.code = c.code
  `).get() as { code: string; type: string; value: number; minSpend: number } | undefined;

  let coupon: CouponResponse | null = null;
  let discount = 0;
  let error = errorOverride;

  if (activeCouponRow) {
    // Check minSpend
    if (subtotal < activeCouponRow.minSpend) {
      // Auto remove active coupon
      db.prepare("DELETE FROM ActiveCoupon").run();
      error = "Minimum spend not met";
    } else {
      coupon = {
        code: activeCouponRow.code,
        type: activeCouponRow.type as "PERCENT" | "FIXED" | "BOGO",
        value: activeCouponRow.value,
        minSpend: activeCouponRow.minSpend,
      };

      // Calculate discount
      if (coupon.type === "PERCENT") {
        discount = subtotal * (coupon.value / 100);
      } else if (coupon.type === "FIXED") {
        discount = coupon.value;
      } else if (coupon.type === "BOGO") {
        const targetProductId = Math.round(coupon.value);
        const item = items.find((i) => i.productId === targetProductId);
        if (item) {
          const freeUnits = Math.floor(item.quantity / 2);
          discount = freeUnits * item.price;
        }
      }
    }
  }

  // Ensure discount is non-negative and capped at subtotal
  discount = Math.max(0, Number(discount.toFixed(2)));
  discount = Math.min(subtotal, discount);
  const total = Number((subtotal - discount).toFixed(2));

  return {
    items,
    subtotal,
    coupon,
    discount,
    total,
    error,
  };
}

export function updateQuantity(productId: number, quantity: number): CartState {
  if (quantity <= 0) {
    db.prepare("DELETE FROM CartItem WHERE productId = ?").run(productId);
  } else {
    // Verify product exists first
    const product = db.prepare("SELECT id FROM Product WHERE id = ?").get(productId);
    if (product) {
      db.prepare(`
        INSERT INTO CartItem (productId, quantity)
        VALUES (?, ?)
        ON CONFLICT(productId)
        DO UPDATE SET quantity = excluded.quantity
      `).run(productId, quantity);
    }
  }
  return getCartState();
}

export function applyCoupon(code: string): CartState {
  const coupon = db.prepare("SELECT code, type, value, minSpend FROM Coupon WHERE code = ?").get(code) as
    | { code: string; type: string; value: number; minSpend: number }
    | undefined;

  if (!coupon) {
    return getCartState("Invalid coupon code");
  }

  const stateBeforeApply = getCartState();
  if (stateBeforeApply.subtotal < coupon.minSpend) {
    return getCartState("Minimum spend not met");
  }

  // Valid coupon, insert into ActiveCoupon (table contains at most 1 row)
  db.prepare("DELETE FROM ActiveCoupon").run();
  db.prepare("INSERT INTO ActiveCoupon (code) VALUES (?)").run(code);

  return getCartState();
}

export function clearCart(): CartState {
  db.prepare("DELETE FROM CartItem").run();
  db.prepare("DELETE FROM ActiveCoupon").run();
  return getCartState();
}

export function getAllProducts() {
  return db.prepare("SELECT id, name, price FROM Product ORDER BY id ASC").all() as {
    id: number;
    name: string;
    price: number;
  }[];
}
