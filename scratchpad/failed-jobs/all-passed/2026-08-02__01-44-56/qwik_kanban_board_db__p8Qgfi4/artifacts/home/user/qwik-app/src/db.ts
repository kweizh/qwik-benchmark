import Database from "better-sqlite3";

const dbPath = "/home/user/qwik-app/kanban.db";
const db = new Database(dbPath);

// Initialize DB schema
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    "column" TEXT NOT NULL,
    position INTEGER NOT NULL
  )
`);

export interface Task {
  id: number;
  title: string;
  column: "TODO" | "IN_PROGRESS" | "DONE";
  position: number;
}

export class TaskNotFoundError extends Error {
  constructor() {
    super("Task not found");
  }
}

export class InvalidColumnError extends Error {
  constructor() {
    super("Invalid column");
  }
}

export class OutOfBoundsError extends Error {
  constructor() {
    super("Target position out of bounds");
  }
}

export function getTasks(): Task[] {
  const stmt = db.prepare(
    'SELECT id, title, "column", position FROM tasks ORDER BY "column" ASC, position ASC'
  );
  return stmt.all() as Task[];
}

export const addTask = db.transaction((title: string): Task => {
  const countStmt = db.prepare(
    "SELECT COUNT(*) as count FROM tasks WHERE \"column\" = 'TODO'"
  );
  const { count } = countStmt.get() as { count: number };
  const insertStmt = db.prepare(
    'INSERT INTO tasks (title, "column", position) VALUES (?, \'TODO\', ?)'
  );
  const result = insertStmt.run(title, count);
  return {
    id: Number(result.lastInsertRowid),
    title,
    column: "TODO",
    position: count,
  };
});

export const moveTask = db.transaction(
  (taskId: number, targetColumn: string, targetPosition: number): void => {
    // 1. Validate target column
    const validColumns = ["TODO", "IN_PROGRESS", "DONE"];
    if (!validColumns.includes(targetColumn)) {
      throw new InvalidColumnError();
    }

    // 2. Fetch the task to move
    const getTaskStmt = db.prepare(
      'SELECT id, title, "column", position FROM tasks WHERE id = ?'
    );
    const task = getTaskStmt.get(taskId) as Task | undefined;
    if (!task) {
      throw new TaskNotFoundError();
    }

    const sourceColumn = task.column;
    const sourcePosition = task.position;

    // 3. Count tasks in target column to validate bounds
    const countTargetStmt = db.prepare(
      'SELECT COUNT(*) as count FROM tasks WHERE "column" = ?'
    );
    const { count: nDest } = countTargetStmt.get(targetColumn) as {
      count: number;
    };

    if (sourceColumn === targetColumn) {
      // Moving within the same column
      if (targetPosition < 0 || targetPosition > nDest - 1) {
        throw new OutOfBoundsError();
      }

      if (sourcePosition === targetPosition) {
        // No changes needed
        return;
      }

      if (sourcePosition < targetPosition) {
        // Decrement positions in [sourcePosition + 1, targetPosition]
        const updateStmt = db.prepare(`
          UPDATE tasks
          SET position = position - 1
          WHERE "column" = ? AND position >= ? AND position <= ?
        `);
        updateStmt.run(sourceColumn, sourcePosition + 1, targetPosition);
      } else {
        // Increment positions in [targetPosition, sourcePosition - 1]
        const updateStmt = db.prepare(`
          UPDATE tasks
          SET position = position + 1
          WHERE "column" = ? AND position >= ? AND position <= ?
        `);
        updateStmt.run(sourceColumn, targetPosition, sourcePosition - 1);
      }

      // Update the moved task's position
      const updateTaskStmt = db.prepare(
        "UPDATE tasks SET position = ? WHERE id = ?"
      );
      updateTaskStmt.run(targetPosition, taskId);
    } else {
      // Moving to a different column
      if (targetPosition < 0 || targetPosition > nDest) {
        throw new OutOfBoundsError();
      }

      // Decrement positions in source column for positions > sourcePosition
      const updateSourceStmt = db.prepare(`
        UPDATE tasks
        SET position = position - 1
        WHERE "column" = ? AND position > ?
      `);
      updateSourceStmt.run(sourceColumn, sourcePosition);

      // Increment positions in target column for positions >= targetPosition
      const updateTargetStmt = db.prepare(`
        UPDATE tasks
        SET position = position + 1
        WHERE "column" = ? AND position >= ?
      `);
      updateTargetStmt.run(targetColumn, targetPosition);

      // Update the moved task's column and position
      const updateTaskStmt = db.prepare(
        'UPDATE tasks SET "column" = ?, position = ? WHERE id = ?'
      );
      updateTaskStmt.run(targetColumn, targetPosition, taskId);
    }
  }
);
