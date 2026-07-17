// SERVER-ONLY module: all SQLite access lives here. This must never be imported
// from client code. It is only used inside `routeLoader$` and server endpoints,
// which Qwik strips out of the client bundle.

import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import type { BoardDTO, CardDTO, Column } from "../types";
import { applyMoveToBoard, COLUMNS, HttpError, seedBoard } from "../lib/board";

export type { BoardDTO, CardDTO, Column };

const DB_PATH = join(process.cwd(), "data", "board.sqlite");

// Reuse a single connection across hot reloads in dev (Next-style global trick).
const globalForDb = globalThis as unknown as { __boardDb?: Database.Database };

function createDb(): Database.Database {
  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      id       INTEGER PRIMARY KEY,
      title    TEXT NOT NULL,
      column   TEXT NOT NULL,
      position INTEGER NOT NULL
    );
  `);
  seedIfEmpty(db);
  return db;
}

export function getDb(): Database.Database {
  if (!globalForDb.__boardDb) {
    globalForDb.__boardDb = createDb();
  }
  return globalForDb.__boardDb;
}

interface CardRow {
  id: number;
  title: string;
  column: string;
  position: number;
}

function seedIfEmpty(db: Database.Database): void {
  const count = db
    .prepare("SELECT COUNT(*) AS n FROM cards")
    .get() as { n: number };
  if (count.n > 0) return;
  const seed = seedBoard();
  const insert = db.prepare(
    "INSERT INTO cards (id, title, column, position) VALUES (?, ?, ?, ?)",
  );
  const tx = db.transaction(() => {
    for (const col of COLUMNS) {
      for (const card of seed[col]) {
        insert.run(card.id, card.title, col, card.position);
      }
    }
  });
  tx();
}

/** Read the full board from the database, ordered by position within columns. */
export function getBoard(): BoardDTO {
  const db = getDb();
  const rows = db
    .prepare("SELECT id, title, column, position FROM cards ORDER BY column, position ASC")
    .all() as CardRow[];

  const board: BoardDTO = { todo: [], doing: [], done: [] };
  for (const row of rows) {
    if (row.column in board) {
      (board as unknown as Record<string, CardDTO[]>)[row.column].push({
        id: row.id,
        title: row.title,
        position: row.position,
      });
    }
  }
  return board;
}

/** Apply a move and persist it. Returns the updated board. */
export function moveCard(
  cardId: number,
  toColumn: Column,
  toIndex: number,
): BoardDTO {
  const current = getBoard();
  const next = applyMoveToBoard(current, cardId, toColumn, toIndex);

  const db = getDb();
  const update = db.prepare(
    "UPDATE cards SET column = ?, position = ? WHERE id = ?",
  );
  const tx = db.transaction(() => {
    for (const col of COLUMNS) {
      for (const card of next[col]) {
        update.run(col, card.position, card.id);
      }
    }
  });
  tx();
  return next;
}

/** Reset the database to the exact initial seed. Returns the seeded board. */
export function resetBoard(): BoardDTO {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM cards").run();
    const seed = seedBoard();
    const insert = db.prepare(
      "INSERT INTO cards (id, title, column, position) VALUES (?, ?, ?, ?)",
    );
    for (const col of COLUMNS) {
      for (const card of seed[col]) {
        insert.run(card.id, card.title, col, card.position);
      }
    }
  });
  tx();
  return getBoard();
}

export { HttpError };