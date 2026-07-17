import Database from 'better-sqlite3';
import { join } from 'path';

let dbInstance: Database.Database | null = null;

export function getDb() {
  if (!dbInstance) {
    const dbPath = join(process.cwd(), 'cart.db');
    dbInstance = new Database(dbPath);
    
    // Create the table if it does not exist
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS cart_items (
        session_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        PRIMARY KEY (session_id, product_id)
      )
    `);
  }
  return dbInstance;
}
