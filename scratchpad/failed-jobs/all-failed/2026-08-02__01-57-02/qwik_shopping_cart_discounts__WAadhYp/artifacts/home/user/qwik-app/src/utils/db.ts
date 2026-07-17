import Database from 'better-sqlite3';

const dbPath = '/home/user/qwik-app/db.sqlite';
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
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

// Seed data if empty
const productCount = (db.prepare('SELECT COUNT(*) as count FROM Product').get() as any).count;
if (productCount === 0) {
  const insertProduct = db.prepare('INSERT INTO Product (id, name, price) VALUES (?, ?, ?)');
  insertProduct.run(1, 'Laptop', 999.99);
  insertProduct.run(2, 'Headphones', 99.99);
  insertProduct.run(3, 'T-Shirt', 19.99);
  insertProduct.run(4, 'Socks', 9.99);
}

const couponCount = (db.prepare('SELECT COUNT(*) as count FROM Coupon').get() as any).count;
if (couponCount === 0) {
  const insertCoupon = db.prepare('INSERT INTO Coupon (code, type, value, minSpend) VALUES (?, ?, ?, ?)');
  insertCoupon.run('SAVE10', 'PERCENT', 10.0, 50.0);
  insertCoupon.run('SAVE50', 'PERCENT', 50.0, 500.0);
  insertCoupon.run('FLAT20', 'FIXED', 20.0, 100.0);
  insertCoupon.run('BOGO2', 'BOGO', 2.0, 0.0);
  insertCoupon.run('BOGO3', 'BOGO', 3.0, 15.0);
}

export { db };
export default db;
