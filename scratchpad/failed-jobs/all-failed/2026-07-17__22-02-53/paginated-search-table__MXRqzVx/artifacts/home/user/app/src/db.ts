import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve('products.db');

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
}

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL
    )
  `);

  const countRow = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
  if (countRow.count === 0) {
    const jsonPath = path.resolve('data/products.json');
    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const insert = db.prepare('INSERT INTO products (id, name, category, price, stock) VALUES (?, ?, ?, ?, ?)');
      const insertMany = db.transaction((products: Product[]) => {
        for (const p of products) {
          insert.run(p.id, p.name, p.category, p.price, p.stock);
        }
      });
      insertMany(data);
    }
  }

  dbInstance = db;
  return db;
}
