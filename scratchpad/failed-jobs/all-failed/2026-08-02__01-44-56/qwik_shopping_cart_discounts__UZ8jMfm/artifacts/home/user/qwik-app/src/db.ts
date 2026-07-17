import { DatabaseSync } from "node:sqlite";

let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!_db) {
    _db = new DatabaseSync("/home/user/qwik-app/db.sqlite");
    initDb(_db);
  }
  return _db;
}

function initDb(db: DatabaseSync) {
  // Enable foreign keys
  db.exec("PRAGMA foreign_keys = ON;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS Product (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS Coupon (
      code TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      value REAL NOT NULL,
      minSpend REAL NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS CartItem (
      productId INTEGER PRIMARY KEY,
      quantity INTEGER NOT NULL,
      FOREIGN KEY(productId) REFERENCES Product(id)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ActiveCoupon (
      code TEXT PRIMARY KEY,
      FOREIGN KEY(code) REFERENCES Coupon(code)
    );
  `);

  // Seed products if table is empty
  const productCount = db.prepare("SELECT COUNT(*) as count FROM Product").get() as any;
  if (!productCount || productCount.count === 0) {
    const insertProduct = db.prepare("INSERT INTO Product (id, name, price) VALUES (?, ?, ?)");
    insertProduct.run(1, "Laptop", 1000.00);
    insertProduct.run(2, "Headphones", 100.00);
    insertProduct.run(3, "Socks", 10.00);
    insertProduct.run(4, "T-Shirt", 20.00);
    insertProduct.run(5, "Coffee Mug", 15.00);
  }

  // Seed coupons if table is empty
  const couponCount = db.prepare("SELECT COUNT(*) as count FROM Coupon").get() as any;
  if (!couponCount || couponCount.count === 0) {
    const insertCoupon = db.prepare("INSERT INTO Coupon (code, type, value, minSpend) VALUES (?, ?, ?, ?)");
    insertCoupon.run("SAVE10", "PERCENT", 10.0, 50.0);
    insertCoupon.run("SAVE20", "PERCENT", 20.0, 100.0);
    insertCoupon.run("SAVE50", "PERCENT", 50.0, 200.0);
    insertCoupon.run("FLAT10", "FIXED", 10.0, 30.0);
    insertCoupon.run("FLAT25", "FIXED", 25.0, 50.0);
    insertCoupon.run("FLAT100", "FIXED", 100.0, 100.0);
    insertCoupon.run("BOGO2", "BOGO", 2.0, 0.0);
    insertCoupon.run("BOGO3", "BOGO", 3.0, 10.0);
    insertCoupon.run("BOGO1", "BOGO", 1.0, 0.0);
  }
}

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

function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function calculateCartState(db: DatabaseSync, errorOverride: string | null = null): CartState {
  // 1. Get all cart items
  const rows = db.prepare(`
    SELECT
      ci.productId,
      p.name,
      p.price,
      ci.quantity
    FROM CartItem ci
    JOIN Product p ON ci.productId = p.id
    ORDER BY ci.productId ASC
  `).all() as any[];

  const items: CartItem[] = rows.map(row => {
    const price = Number(row.price);
    const quantity = Number(row.quantity);
    return {
      productId: Number(row.productId),
      name: String(row.name),
      price: price,
      quantity: quantity,
      total: round2(price * quantity)
    };
  });

  const subtotal = round2(items.reduce((sum, item) => sum + item.total, 0));

  // 2. Get active coupon
  const activeCouponRow = db.prepare(`
    SELECT ac.code, c.type, c.value, c.minSpend
    FROM ActiveCoupon ac
    JOIN Coupon c ON ac.code = c.code
  `).get() as any;

  let coupon: Coupon | null = null;
  let discount = 0;
  let error = errorOverride;

  if (activeCouponRow) {
    const minSpend = Number(activeCouponRow.minSpend);
    if (subtotal < minSpend) {
      // Automatically remove active coupon
      db.prepare("DELETE FROM ActiveCoupon").run();
      error = "Minimum spend not met";
    } else {
      coupon = {
        code: String(activeCouponRow.code),
        type: activeCouponRow.type as "PERCENT" | "FIXED" | "BOGO",
        value: Number(activeCouponRow.value),
        minSpend: minSpend
      };

      if (coupon.type === "PERCENT") {
        discount = subtotal * (coupon.value / 100);
      } else if (coupon.type === "FIXED") {
        discount = coupon.value;
      } else if (coupon.type === "BOGO") {
        const targetProductId = Math.round(coupon.value);
        const targetItem = items.find(item => item.productId === targetProductId);
        if (targetItem) {
          const freeUnits = Math.floor(targetItem.quantity / 2);
          discount = freeUnits * targetItem.price;
        }
      }
      // Cap discount at subtotal
      discount = Math.min(subtotal, discount);
      discount = round2(discount);
    }
  }

  const total = round2(Math.max(0, subtotal - discount));

  return {
    items,
    subtotal,
    coupon,
    discount,
    total,
    error
  };
}

export function mutateCart(db: DatabaseSync, actionObj: any): CartState {
  const action = actionObj?.action;

  if (action === "clear") {
    db.prepare("DELETE FROM CartItem").run();
    db.prepare("DELETE FROM ActiveCoupon").run();
    return calculateCartState(db);
  }

  if (action === "update") {
    const productId = Number(actionObj.productId);
    const quantity = Number(actionObj.quantity);

    if (isNaN(productId)) {
      return calculateCartState(db, "Invalid product ID");
    }

    // Check if product exists
    const product = db.prepare("SELECT id FROM Product WHERE id = ?").get(productId) as any;
    if (!product) {
      return calculateCartState(db, "Product not found");
    }

    if (quantity <= 0) {
      db.prepare("DELETE FROM CartItem WHERE productId = ?").run(productId);
    } else {
      db.prepare(`
        INSERT INTO CartItem (productId, quantity)
        VALUES (?, ?)
        ON CONFLICT(productId) DO UPDATE SET quantity = excluded.quantity
      `).run(productId, quantity);
    }

    return calculateCartState(db);
  }

  if (action === "applyCoupon") {
    const code = actionObj.code;
    if (typeof code !== "string" || !code) {
      return calculateCartState(db, "Invalid coupon code");
    }

    // Check if coupon exists
    const coupon = db.prepare("SELECT code, type, value, minSpend FROM Coupon WHERE code = ?").get(code) as any;
    if (!coupon) {
      return calculateCartState(db, "Invalid coupon code");
    }

    // Calculate current subtotal to check minSpend
    const currentState = calculateCartState(db);
    if (currentState.subtotal < Number(coupon.minSpend)) {
      return calculateCartState(db, "Minimum spend not met");
    }

    // Apply the coupon (replace any active coupon)
    db.prepare("DELETE FROM ActiveCoupon").run();
    db.prepare("INSERT INTO ActiveCoupon (code) VALUES (?)").run(code);

    return calculateCartState(db);
  }

  return calculateCartState(db, "Invalid action");
}
