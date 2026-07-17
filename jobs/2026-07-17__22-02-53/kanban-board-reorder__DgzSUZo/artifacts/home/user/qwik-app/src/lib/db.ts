import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'kanban.db');
const db = new Database(dbPath);

// Initialize DB and create table
db.exec(`
  CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    column TEXT NOT NULL,
    position INTEGER NOT NULL
  )
`);

export interface Card {
  id: number;
  title: string;
  column: 'todo' | 'doing' | 'done';
  position: number;
}

export const initialSeed: Omit<Card, 'position'>[] = [
  // todo
  { id: 1, title: 'Design landing page', column: 'todo' },
  { id: 2, title: 'Write unit tests', column: 'todo' },
  { id: 3, title: 'Set up CI', column: 'todo' },
  // doing
  { id: 4, title: 'Implement auth', column: 'doing' },
  { id: 5, title: 'Refactor store', column: 'doing' },
  // done
  { id: 6, title: 'Project scaffolding', column: 'done' },
];

export function seedDatabase() {
  const deleteStmt = db.prepare('DELETE FROM cards');
  const insertStmt = db.prepare('INSERT INTO cards (id, title, column, position) VALUES (?, ?, ?, ?)');

  const runSeed = db.transaction(() => {
    deleteStmt.run();
    
    // Group by column to assign contiguous positions
    const columns: Record<string, typeof initialSeed> = {
      todo: [],
      doing: [],
      done: [],
    };
    
    for (const card of initialSeed) {
      columns[card.column].push(card);
    }

    for (const col of ['todo', 'doing', 'done'] as const) {
      columns[col].forEach((card, idx) => {
        insertStmt.run(card.id, card.title, card.column, idx);
      });
    }
  });

  runSeed();
}

// Check if empty and seed
const countResult = db.prepare('SELECT COUNT(*) as count FROM cards').get() as { count: number };
if (countResult.count === 0) {
  seedDatabase();
}

export function getBoard() {
  const stmt = db.prepare('SELECT id, title, column, position FROM cards ORDER BY position ASC');
  const rows = stmt.all() as Card[];

  const board: {
    todo: { id: number; title: string; position: number }[];
    doing: { id: number; title: string; position: number }[];
    done: { id: number; title: string; position: number }[];
  } = {
    todo: [],
    doing: [],
    done: [],
  };

  for (const row of rows) {
    if (row.column === 'todo' || row.column === 'doing' || row.column === 'done') {
      board[row.column].push({
        id: row.id,
        title: row.title,
        position: row.position,
      });
    }
  }

  return board;
}

export function moveCard(cardId: number, toColumn: 'todo' | 'doing' | 'done', toIndex: number): { success: boolean; errorStatus?: number; errorMessage?: string } {
  // 1. Get the card
  const cardStmt = db.prepare('SELECT id, title, column, position FROM cards WHERE id = ?');
  const card = cardStmt.get(cardId) as Card | undefined;
  if (!card) {
    return { success: false, errorStatus: 404, errorMessage: 'Card not found' };
  }

  // 2. Validate toColumn
  if (toColumn !== 'todo' && toColumn !== 'doing' && toColumn !== 'done') {
    return { success: false, errorStatus: 400, errorMessage: 'Invalid target column' };
  }

  // 3. Get all cards except the moved card, ordered by position ascending
  const allOtherStmt = db.prepare('SELECT id, title, column, position FROM cards WHERE id != ? ORDER BY position ASC');
  const otherCards = allOtherStmt.all(cardId) as Card[];

  // Group other cards by column
  const columns: Record<'todo' | 'doing' | 'done', Card[]> = {
    todo: [],
    doing: [],
    done: [],
  };

  for (const c of otherCards) {
    columns[c.column].push(c);
  }

  // 4. Determine target index and insert
  const targetColCards = columns[toColumn];
  const clampedIndex = Math.max(0, Math.min(toIndex, targetColCards.length));
  
  // Insert the card into the target column array
  targetColCards.splice(clampedIndex, 0, card);

  // 5. Save updated positions and columns to database in a transaction
  const updateStmt = db.prepare('UPDATE cards SET column = ?, position = ? WHERE id = ?');
  
  const runUpdate = db.transaction(() => {
    for (const col of ['todo', 'doing', 'done'] as const) {
      columns[col].forEach((c, idx) => {
        updateStmt.run(col, idx, c.id);
      });
    }
  });

  runUpdate();

  return { success: true };
}
