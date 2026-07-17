import Database from "better-sqlite3";
import path from "path";

const DB_PATH = "/home/user/qwik-app/db.sqlite";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initializeDb(db);
  }
  return db;
}

function initializeDb(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS Product (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Coupon (
      code TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('PERCENT', 'FIXED', 'BOGO')),
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

  // Seed data: only insert if tables are empty
  const productCount = db.prepare("SELECT COUNT(*) as count FROM Product").get() as { count: number };
  if (productCount.count === 0) {
    const insertProduct = db.prepare("INSERT INTO Product (name, price) VALUES (?, ?)");
    insertProduct.run("Widget A", 10.0);
    insertProduct.run("Widget B", 25.0);
    insertProduct.run("Widget C", 50.0);
    insertProduct.run("Widget D", 100.0);
  }

  const couponCount = db.prepare("SELECT COUNT(*) as count FROM Coupon").get() as { count: number };
  if (couponCount.count === 0) {
    const insertCoupon = db.prepare("INSERT INTO Coupon (code, type, value, minSpend) VALUES (?, ?, ?, ?)");
    insertCoupon.run("SAVE10", "PERCENT", 10.0, 25.0);
    insertCoupon.run("FLAT5", "FIXED", 5.0, 20.0);
    insertCoupon.run("BOGO2", "BOGO", 2.0, 30.0);
    insertCoupon.run("BOGO1", "BOGO", 1.0, 15.0);
    insertCoupon.run("SAVE50", "PERCENT", 50.0, 100.0);
    insertCoupon.run("FLAT50", "FIXED", 50.0, 50.0);
  }
}
