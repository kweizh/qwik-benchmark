import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type Column = "TODO" | "IN_PROGRESS" | "DONE";

export interface Task {
  id: number;
  title: string;
  column: Column;
  position: number;
}

export const COLUMNS: Column[] = ["TODO", "IN_PROGRESS", "DONE"];

const DB_PATH = "/home/user/qwik-app/kanban.db";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      column TEXT NOT NULL CHECK (column IN ('TODO', 'IN_PROGRESS', 'DONE')),
      position INTEGER NOT NULL
    );
  `);

  return db;
}

export function getAllTasks(): Task[] {
  const database = getDb();
  return database
    .prepare(
      `SELECT id, title, column, position FROM tasks ORDER BY column ASC, position ASC`,
    )
    .all() as Task[];
}

export function getTasksByColumn(column: Column): Task[] {
  const database = getDb();
  return database
    .prepare(
      `SELECT id, title, column, position FROM tasks WHERE column = ? ORDER BY position ASC`,
    )
    .all(column) as Task[];
}

export function addTask(title: string): Task {
  const database = getDb();

  const tx = database.transaction((titleValue: string) => {
    const countRow = database
      .prepare(`SELECT COUNT(*) as cnt FROM tasks WHERE column = ?`)
      .get("TODO") as { cnt: number };
    const position = countRow.cnt;

    const info = database
      .prepare(
        `INSERT INTO tasks (title, column, position) VALUES (?, 'TODO', ?)`,
      )
      .run(titleValue, position);

    return {
      id: Number(info.lastInsertRowid),
      title: titleValue,
      column: "TODO" as Column,
      position,
    };
  });

  return tx(title);
}

export interface MoveResult {
  ok: boolean;
  status?: number;
  error?: string;
}

export function moveTask(
  taskId: number,
  targetColumn: string,
  targetPosition: number,
): MoveResult {
  const database = getDb();

  const tx = database.transaction(() => {
    const task = database
      .prepare(`SELECT id, title, column, position FROM tasks WHERE id = ?`)
      .get(taskId) as Task | undefined;

    if (!task) {
      return { ok: false, status: 404, error: "Task not found" } as MoveResult;
    }

    if (!COLUMNS.includes(targetColumn as Column)) {
      return {
        ok: false,
        status: 400,
        error: "Invalid targetColumn",
      } as MoveResult;
    }

    if (
      typeof targetPosition !== "number" ||
      !Number.isInteger(targetPosition) ||
      targetPosition < 0
    ) {
      return {
        ok: false,
        status: 400,
        error: "Invalid targetPosition",
      } as MoveResult;
    }

    const srcColumn = task.column;
    const srcPosition = task.position;
    const destColumn = targetColumn as Column;
    const destPosition = targetPosition;

    if (srcColumn === destColumn) {
      const countRow = database
        .prepare(`SELECT COUNT(*) as cnt FROM tasks WHERE column = ?`)
        .get(srcColumn) as { cnt: number };
      // Max allowed position when staying in same column is count - 1
      if (destPosition > countRow.cnt - 1) {
        return {
          ok: false,
          status: 400,
          error: "targetPosition out of bounds",
        } as MoveResult;
      }

      if (srcPosition === destPosition) {
        return { ok: true } as MoveResult;
      }

      if (srcPosition < destPosition) {
        database
          .prepare(
            `UPDATE tasks SET position = position - 1 WHERE column = ? AND position > ? AND position <= ?`,
          )
          .run(srcColumn, srcPosition, destPosition);
      } else {
        database
          .prepare(
            `UPDATE tasks SET position = position + 1 WHERE column = ? AND position >= ? AND position < ?`,
          )
          .run(srcColumn, destPosition, srcPosition);
      }

      database
        .prepare(`UPDATE tasks SET position = ? WHERE id = ?`)
        .run(destPosition, taskId);
    } else {
      const destCountRow = database
        .prepare(`SELECT COUNT(*) as cnt FROM tasks WHERE column = ?`)
        .get(destColumn) as { cnt: number };
      // After moving, dest column will have destCountRow.cnt + 1 tasks.
      // Valid positions are 0..destCountRow.cnt (inclusive).
      if (destPosition > destCountRow.cnt) {
        return {
          ok: false,
          status: 400,
          error: "targetPosition out of bounds",
        } as MoveResult;
      }

      database
        .prepare(
          `UPDATE tasks SET position = position - 1 WHERE column = ? AND position > ?`,
        )
        .run(srcColumn, srcPosition);

      database
        .prepare(
          `UPDATE tasks SET position = position + 1 WHERE column = ? AND position >= ?`,
        )
        .run(destColumn, destPosition);

      database
        .prepare(`UPDATE tasks SET column = ?, position = ? WHERE id = ?`)
        .run(destColumn, destPosition, taskId);
    }

    return { ok: true } as MoveResult;
  });

  return tx();
}
