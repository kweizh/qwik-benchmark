/**
 * Server-side SQLite persistence for the Kanban board.
 *
 * This module must NEVER be imported by client-side code. It is only used
 * inside routeLoader$ and server endpoints (see vite.config.ts ssr.external).
 */
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type ColumnKey = "todo" | "doing" | "done";

export const COLUMNS: ColumnKey[] = ["todo", "doing", "done"];

export interface Card {
  id: number;
  title: string;
  position: number;
}

export type Board = Record<ColumnKey, Card[]>;

export interface InitialCard {
  id: number;
  title: string;
  column: ColumnKey;
  position: number;
}

const INITIAL_BOARD: InitialCard[] = [
  { id: 1, title: "Design landing page", column: "todo", position: 0 },
  { id: 2, title: "Write unit tests", column: "todo", position: 1 },
  { id: 3, title: "Set up CI", column: "todo", position: 2 },
  { id: 4, title: "Implement auth", column: "doing", position: 0 },
  { id: 5, title: "Refactor store", column: "doing", position: 1 },
  { id: 6, title: "Project scaffolding", column: "done", position: 0 },
];

const DB_PATH = resolve(process.cwd(), ".data", "kanban.sqlite");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      id       INTEGER PRIMARY KEY,
      title    TEXT    NOT NULL,
      column   TEXT    NOT NULL CHECK (column IN ('todo','doing','done')),
      position INTEGER NOT NULL,
      UNIQUE (column, position)
    );
    CREATE INDEX IF NOT EXISTS idx_cards_column_position
      ON cards (column, position);
  `);
  const count = db
    .prepare("SELECT COUNT(*) AS n FROM cards")
    .get() as { n: number };
  if (count.n === 0) {
    seed(db);
  }
  _db = db;
  return db;
}

function seed(db: Database.Database): void {
  const insert = db.prepare(
    "INSERT INTO cards (id, title, column, position) VALUES (?, ?, ?, ?)",
  );
  const tx = db.transaction((rows: InitialCard[]) => {
    for (const row of rows) {
      insert.run(row.id, row.title, row.column, row.position);
    }
  });
  tx(INITIAL_BOARD);
}

function rowToCard(row: { id: number; title: string; position: number }): Card {
  return { id: row.id, title: row.title, position: row.position };
}

/**
 * Returns the board as a column->cards map, with cards ordered by position ASC.
 * Positions are always contiguous starting at 0 within each column.
 */
export function readBoard(): Board {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, title, column, position FROM cards ORDER BY column, position ASC",
    )
    .all() as Array<{
    id: number;
    title: string;
    column: ColumnKey;
    position: number;
  }>;

  const board: Board = { todo: [], doing: [], done: [] };
  for (const row of rows) {
    board[row.column].push(rowToCard(row));
  }
  // Defensive: re-number positions to be 0..n-1 per column so the output is
  // always consistent even if the underlying rows drift somehow.
  for (const col of COLUMNS) {
    board[col] = board[col].map((c, i) => ({ ...c, position: i }));
  }
  return board;
}

/**
 * Resets the board to the initial seed. Returns the freshly seeded board.
 */
export function resetBoard(): Board {
  const db = getDb();
  const tx = db.transaction(() => {
    db.exec("DELETE FROM cards;");
    seed(db);
  });
  tx();
  return readBoard();
}

/**
 * Moves the card with `cardId` to `toColumn` at `toIndex`.
 *
 * Behavior:
 *  - If `cardId` is unknown, throws NotFoundError (404).
 *  - If `toColumn` is not one of the three valid columns, throws BadRequestError (400).
 *  - Negative `toIndex` is clamped to 0; values greater than the target column
 *    length append the card at the end.
 *  - Positions in both the source and target column are renumbered to stay
 *    contiguous (0..n-1) after the move.
 *
 * Returns the updated board.
 */
export class NotFoundError extends Error {
  status = 404;
  constructor(msg = "not found") {
    super(msg);
  }
}
export class BadRequestError extends Error {
  status = 400;
  constructor(msg = "bad request") {
    super(msg);
  }
}

export function moveCard(
  cardId: number,
  toColumn: string,
  toIndex: number,
): Board {
  if (!COLUMNS.includes(toColumn as ColumnKey)) {
    throw new BadRequestError(`invalid column: ${toColumn}`);
  }
  if (
    !Number.isFinite(cardId) ||
    !Number.isInteger(cardId) ||
    typeof cardId !== "number"
  ) {
    throw new BadRequestError("invalid cardId");
  }
  if (!Number.isFinite(toIndex)) {
    throw new BadRequestError("invalid toIndex");
  }

  const target = toColumn as ColumnKey;
  const db = getDb();
  const tx = db.transaction((): Board => {
    const found = db
      .prepare("SELECT id, column FROM cards WHERE id = ?")
      .get(cardId) as { id: number; column: ColumnKey } | undefined;
    if (!found) {
      throw new NotFoundError(`card ${cardId} not found`);
    }
    const fromColumn = found.column;

    // Current column contents ordered by position ASC.
    const fromRows = db
      .prepare(
        "SELECT id, title, position FROM cards WHERE column = ? ORDER BY position ASC",
      )
      .all(fromColumn) as Array<{
      id: number;
      title: string;
      position: number;
    }>;
    const toRows =
      fromColumn === target
        ? fromRows.slice()
        : (db
            .prepare(
              "SELECT id, title, position FROM cards WHERE column = ? ORDER BY position ASC",
            )
            .all(target) as Array<{
            id: number;
            title: string;
            position: number;
          }>);

    // Remove the moving card from its source list.
    const moving = fromRows.find((r) => r.id === cardId)!;
    const sourceList = fromRows.filter((r) => r.id !== cardId);
    const targetList = toRows.filter((r) => r.id !== cardId);

    // Compute clamped insert index on the target list.
    let idx = Math.floor(toIndex);
    if (idx < 0) idx = 0;
    if (idx > targetList.length) idx = targetList.length;

    // Insert the moving card into the target list at the requested index.
    targetList.splice(idx, 0, moving);

    // Persist by renumbering every column that changed.
    const update = db.prepare(
      "UPDATE cards SET column = ?, position = ? WHERE id = ?",
    );

    if (fromColumn === target) {
      // Single column changed: renumber targetList.
      targetList.forEach((row, i) => update.run(target, i, row.id));
    } else {
      // Two columns changed: renumber sourceList and targetList.
      sourceList.forEach((row, i) => update.run(fromColumn, i, row.id));
      targetList.forEach((row, i) => update.run(target, i, row.id));
    }

    return readBoard();
  });
  return tx();
}
