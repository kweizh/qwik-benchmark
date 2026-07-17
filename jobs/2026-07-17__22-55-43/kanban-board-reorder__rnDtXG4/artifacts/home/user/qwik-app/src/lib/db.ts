import Database from "better-sqlite3";
import path from "node:path";

export type ColumnName = "todo" | "doing" | "done";

export interface Card {
  id: number;
  title: string;
  column: ColumnName;
  position: number;
}

export interface BoardColumn {
  id: number;
  title: string;
  position: number;
}

export interface Board {
  todo: BoardColumn[];
  doing: BoardColumn[];
  done: BoardColumn[];
}

export const COLUMNS: ColumnName[] = ["todo", "doing", "done"];

const SEED: Array<{ id: number; title: string; column: ColumnName; position: number }> = [
  { id: 1, title: "Design landing page", column: "todo", position: 0 },
  { id: 2, title: "Write unit tests", column: "todo", position: 1 },
  { id: 3, title: "Set up CI", column: "todo", position: 2 },
  { id: 4, title: "Implement auth", column: "doing", position: 0 },
  { id: 5, title: "Refactor store", column: "doing", position: 1 },
  { id: 6, title: "Project scaffolding", column: "done", position: 0 },
];

let dbInstance: Database.Database | null = null;

function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const dbPath = path.join(process.cwd(), "kanban.sqlite");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      column_name TEXT NOT NULL,
      position INTEGER NOT NULL
    );
  `);

  const count = (
    db.prepare("SELECT COUNT(*) as count FROM cards").get() as { count: number }
  ).count;

  if (count === 0) {
    seedDb(db);
  }

  dbInstance = db;
  return db;
}

function seedDb(db: Database.Database) {
  const del = db.prepare("DELETE FROM cards");
  const insert = db.prepare(
    "INSERT INTO cards (id, title, column_name, position) VALUES (@id, @title, @column, @position)",
  );
  const tx = db.transaction(() => {
    del.run();
    for (const card of SEED) {
      insert.run(card);
    }
  });
  tx();
}

export function resetBoard(): Board {
  const db = getDb();
  seedDb(db);
  return getBoard();
}

export function getBoard(): Board {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, title, column_name as column, position FROM cards ORDER BY column_name, position ASC",
    )
    .all() as Card[];

  const board: Board = { todo: [], doing: [], done: [] };
  for (const row of rows) {
    board[row.column].push({
      id: row.id,
      title: row.title,
      position: row.position,
    });
  }
  return board;
}

export interface MoveResult {
  ok: boolean;
  error?: "not_found" | "invalid";
  board?: Board;
}

export function moveCard(
  cardId: number,
  toColumn: string,
  toIndex: number,
): MoveResult {
  if (
    typeof cardId !== "number" ||
    !Number.isInteger(cardId) ||
    typeof toIndex !== "number" ||
    !Number.isInteger(toIndex)
  ) {
    return { ok: false, error: "invalid" };
  }

  if (!COLUMNS.includes(toColumn as ColumnName)) {
    return { ok: false, error: "invalid" };
  }

  const db = getDb();

  const existing = db
    .prepare("SELECT id, title, column_name as column, position FROM cards WHERE id = ?")
    .get(cardId) as Card | undefined;

  if (!existing) {
    return { ok: false, error: "not_found" };
  }

  const fromColumn = existing.column;
  const targetColumn = toColumn as ColumnName;
  const clampedIndex = Math.max(0, toIndex);

  const tx = db.transaction(() => {
    // Fetch all cards in the source column (excluding the moving card), ordered.
    const sourceCards = (
      db
        .prepare(
          "SELECT id, title, column_name as column, position FROM cards WHERE column_name = ? AND id != ? ORDER BY position ASC",
        )
        .all(fromColumn, cardId) as Card[]
    );

    if (fromColumn === targetColumn) {
      // Reorder within same column.
      const insertAt = Math.min(clampedIndex, sourceCards.length);
      sourceCards.splice(insertAt, 0, existing);

      const update = db.prepare(
        "UPDATE cards SET position = ? WHERE id = ?",
      );
      sourceCards.forEach((card, idx) => {
        update.run(idx, card.id);
      });
    } else {
      // Remove from source column: renumber remaining source cards.
      const updateSource = db.prepare(
        "UPDATE cards SET position = ? WHERE id = ?",
      );
      sourceCards.forEach((card, idx) => {
        updateSource.run(idx, card.id);
      });

      // Insert into target column at clamped index.
      const targetCards = (
        db
          .prepare(
            "SELECT id, title, column_name as column, position FROM cards WHERE column_name = ? ORDER BY position ASC",
          )
          .all(targetColumn) as Card[]
      );

      const insertAt = Math.min(clampedIndex, targetCards.length);
      targetCards.splice(insertAt, 0, existing);

      const updateTarget = db.prepare(
        "UPDATE cards SET column_name = ?, position = ? WHERE id = ?",
      );
      targetCards.forEach((card, idx) => {
        updateTarget.run(targetColumn, idx, card.id);
      });
    }
  });

  tx();

  return { ok: true, board: getBoard() };
}
