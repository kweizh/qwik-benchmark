import Database from "better-sqlite3";

let dbInstance: Database.Database | null = null;

export function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = "/home/user/qwik-app/db.sqlite";
  const db = new Database(dbPath);

  // Enable foreign keys
  db.pragma("foreign_keys = ON");

  // Create tables
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

  // Seed data if Product table is empty
  const productCount = db.prepare("SELECT COUNT(*) as count FROM Product").get() as { count: number };
  if (productCount.count === 0) {
    const insertProduct = db.prepare("INSERT INTO Product (id, name, price) VALUES (?, ?, ?)");
    const products = [
      [1, "Laptop", 1000.0],
      [2, "Headphones", 100.0],
      [3, "Mouse", 50.0],
      [4, "Keyboard", 80.0],
    ];
    for (const prod of products) {
      insertProduct.run(prod[0], prod[1], prod[2]);
    }
  }

  // Seed data if Coupon table is empty
  const couponCount = db.prepare("SELECT COUNT(*) as count FROM Coupon").get() as { count: number };
  if (couponCount.count === 0) {
    const insertCoupon = db.prepare("INSERT INTO Coupon (code, type, value, minSpend) VALUES (?, ?, ?, ?)");
    const coupons = [
      ["SAVE10", "PERCENT", 10.0, 100.0],
      ["SAVE20", "PERCENT", 20.0, 200.0],
      ["FLAT15", "FIXED", 15.0, 50.0],
      ["FLAT50", "FIXED", 50.0, 150.0],
      ["BOGOHP", "BOGO", 2.0, 0.0],
      ["BOGOMOUSE", "BOGO", 3.0, 10.0],
    ];
    for (const coup of coupons) {
      insertCoupon.run(coup[0], coup[1], coup[2], coup[3]);
    }
  }

  dbInstance = db;
  return db;
}
