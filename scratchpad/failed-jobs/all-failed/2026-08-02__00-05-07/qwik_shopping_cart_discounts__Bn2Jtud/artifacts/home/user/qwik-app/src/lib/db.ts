import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = "/home/user/qwik-app/db.sqlite";

// A module-level singleton so we don't re-open / re-seed the database on
// every request (Vite/Qwik will keep this module alive for the life of the
// server process in dev & production).
let dbInstance: DatabaseSync | null = null;

function createSchema(db: DatabaseSync) {
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
}

function seedIfEmpty(db: DatabaseSync) {
  const productCount = db
    .prepare("SELECT COUNT(*) AS c FROM Product")
    .get() as { c: number };

  if (productCount.c === 0) {
    const insertProduct = db.prepare(
      "INSERT INTO Product (name, price) VALUES (?, ?)",
    );
    insertProduct.run("Widget", 25.0);
    insertProduct.run("Gadget", 50.0);
    insertProduct.run("Gizmo", 15.0);
    insertProduct.run("Doohickey", 10.0);
  }

  const couponCount = db
    .prepare("SELECT COUNT(*) AS c FROM Coupon")
    .get() as { c: number };

  if (couponCount.c === 0) {
    const insertCoupon = db.prepare(
      "INSERT INTO Coupon (code, type, value, minSpend) VALUES (?, ?, ?, ?)",
    );
    // 15% off when spending at least $50
    insertCoupon.run("SAVE15", "PERCENT", 15.0, 50.0);
    // $10 flat off when spending at least $20
    insertCoupon.run("FLAT10", "FIXED", 10.0, 20.0);
    // Buy One Get One Free on product id 3 (Gizmo), no minimum spend
    insertCoupon.run("BOGOGIZMO", "BOGO", 3.0, 0.0);
  }
}

export function getDb(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA foreign_keys = ON;");

  createSchema(db);
  seedIfEmpty(db);

  dbInstance = db;
  return dbInstance;
}
