import Database from 'better-sqlite3';

export interface Transaction {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
}

export function getTransactions(filters: {
  from?: string | null;
  to?: string | null;
  category?: string | null;
}): Transaction[] {
  const db = new Database('/home/user/qwik-app/data/reports.db');
  try {
    let query = 'SELECT id, date, category, description, amount FROM transactions';
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.from) {
      conditions.push('date >= ?');
      params.push(filters.from);
    }
    if (filters.to) {
      conditions.push('date <= ?');
      params.push(filters.to);
    }
    if (filters.category) {
      conditions.push('category = ?');
      params.push(filters.category);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY id ASC';

    return db.prepare(query).all(...params) as Transaction[];
  } finally {
    db.close();
  }
}
