// Pure, client-safe board logic. No server-only imports here so this module is
// safe to bundle into the client. Both the optimistic client update and the
// server persistence share this implementation to stay consistent.

import type { BoardDTO, CardDTO, Column, MoveRequest } from "../types";

export const COLUMNS: Column[] = ["todo", "doing", "done"];

export function isColumn(value: unknown): value is Column {
  return value === "todo" || value === "doing" || value === "done";
}

export function emptyBoard(): BoardDTO {
  return { todo: [], doing: [], done: [] };
}

/** The initial seed board (order top-to-bottom within each column). */
export function seedBoard(): BoardDTO {
  return {
    todo: [
      { id: 1, title: "Design landing page", position: 0 },
      { id: 2, title: "Write unit tests", position: 1 },
      { id: 3, title: "Set up CI", position: 2 },
    ],
    doing: [
      { id: 4, title: "Implement auth", position: 0 },
      { id: 5, title: "Refactor store", position: 1 },
    ],
    done: [{ id: 6, title: "Project scaffolding", position: 0 }],
  };
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Apply a move to a board, returning a NEW board with contiguous 0-based
 * positions in every affected column. Throws HttpError on invalid input.
 *
 * Semantics:
 *  - Remove the card from its source column.
 *  - Insert it into `toColumn` at `toIndex` (clamped: negative -> 0, greater
 *    than the target column's card count -> append at the end).
 *  - Re-number positions contiguously (0..n-1) in every column.
 */
export function applyMoveToBoard(
  board: BoardDTO,
  cardId: number,
  toColumn: Column,
  toIndex: number,
): BoardDTO {
  if (!isColumn(toColumn)) {
    throw new HttpError(400, `Invalid toColumn: ${String(toColumn)}`);
  }
  if (!Number.isInteger(cardId)) {
    throw new HttpError(400, "Invalid cardId");
  }

  // Locate the card being moved and its source column.
  let fromColumn: Column | null = null;
  let movedCard: CardDTO | null = null;
  for (const col of COLUMNS) {
    const found = board[col].find((c) => c.id === cardId);
    if (found) {
      fromColumn = col;
      movedCard = found;
      break;
    }
  }
  if (!movedCard || !fromColumn) {
    throw new HttpError(404, `Card ${cardId} not found`);
  }

  // Build ordered id lists per column.
  const lists: Record<Column, number[]> = {
    todo: board.todo.map((c) => c.id),
    doing: board.doing.map((c) => c.id),
    done: board.done.map((c) => c.id),
  };

  // Remove the card from its source column.
  lists[fromColumn] = lists[fromColumn].filter((id) => id !== cardId);

  // Clamp the target index against the target column's current length (which,
  // for a same-column move, already excludes the moved card).
  const targetList = lists[toColumn];
  let idx = toIndex;
  if (!Number.isFinite(idx)) {
    idx = targetList.length;
  }
  if (idx < 0) idx = 0;
  if (idx > targetList.length) idx = targetList.length;

  // Insert the card at the computed index.
  targetList.splice(idx, 0, cardId);

  // Build a lookup of card -> title from the original board.
  const titleById = new Map<number, string>();
  for (const col of COLUMNS) {
    for (const c of board[col]) titleById.set(c.id, c.title);
  }

  // Re-number positions contiguously and produce the new board.
  const next: BoardDTO = emptyBoard();
  for (const col of COLUMNS) {
    next[col] = lists[col].map((id, position) => ({
      id,
      title: titleById.get(id) ?? "",
      position,
    }));
  }
  return next;
}

/** Validate a parsed move request body. Throws HttpError(400) if invalid. */
export function validateMoveBody(body: unknown): MoveRequest {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "Invalid JSON body");
  }
  const b = body as Record<string, unknown>;
  const cardId = b.cardId;
  const toColumn = b.toColumn;
  const toIndex = b.toIndex;
  if (
    typeof cardId !== "number" ||
    !Number.isInteger(cardId) ||
    typeof toColumn !== "string" ||
    !isColumn(toColumn) ||
    typeof toIndex !== "number" ||
    !Number.isFinite(toIndex)
  ) {
    throw new HttpError(400, "Missing or invalid fields");
  }
  return { cardId, toColumn, toIndex };
}