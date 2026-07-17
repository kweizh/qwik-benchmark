import type { RequestHandler } from "@builder.io/qwik-city";
import { getDb, VALID_COLUMNS, type Task } from "../../../db";

export const onPost: RequestHandler = async ({ request, json }) => {
  const db = getDb();
  const body = await request.json();
  const { taskId, targetColumn, targetPosition } = body;

  // Validate targetColumn
  if (!VALID_COLUMNS.includes(targetColumn)) {
    json(400, { error: "Invalid target column" });
    return;
  }

  // Fetch the task
  const task = db
    .prepare("SELECT id, title, column, position FROM tasks WHERE id = ?")
    .get(taskId) as Task | undefined;

  if (!task) {
    json(404, { error: "Task not found" });
    return;
  }

  const srcColumn = task.column;
  const srcPosition = task.position;

  // Count tasks in target column for bounds checking
  const targetCount = (
    db
      .prepare("SELECT COUNT(*) as count FROM tasks WHERE column = ?")
      .get(targetColumn) as { count: number }
  ).count;

  // Determine max valid position
  let maxPosition: number;
  if (srcColumn === targetColumn) {
    // Moving within same column: targetPosition can be 0 to count-1
    maxPosition = targetCount - 1;
  } else {
    // Moving to different column: targetPosition can be 0 to count (inclusive, since we're adding one)
    maxPosition = targetCount;
  }

  if (
    targetPosition < 0 ||
    targetPosition > maxPosition ||
    !Number.isInteger(targetPosition)
  ) {
    json(400, { error: "Invalid target position" });
    return;
  }

  // Perform the move in a transaction
  db.transaction(() => {
    if (srcColumn === targetColumn) {
      // Same column move
      if (srcPosition === targetPosition) {
        // No change needed
        return;
      }

      if (srcPosition < targetPosition) {
        // Moving down: decrement positions in (srcPosition+1, targetPosition]
        db.prepare(
          `UPDATE tasks SET position = position - 1
           WHERE column = ? AND position > ? AND position <= ?`
        ).run(srcColumn, srcPosition, targetPosition);
      } else {
        // Moving up: increment positions in [targetPosition, srcPosition-1]
        db.prepare(
          `UPDATE tasks SET position = position + 1
           WHERE column = ? AND position >= ? AND position < ?`
        ).run(srcColumn, targetPosition, srcPosition);
      }

      // Set the moved task's position
      db.prepare("UPDATE tasks SET position = ? WHERE id = ?").run(
        targetPosition,
        taskId
      );
    } else {
      // Different column move

      // Decrement positions in source column for tasks with position > srcPosition
      db.prepare(
        `UPDATE tasks SET position = position - 1
         WHERE column = ? AND position > ?`
      ).run(srcColumn, srcPosition);

      // Increment positions in target column for tasks with position >= targetPosition
      db.prepare(
        `UPDATE tasks SET position = position + 1
         WHERE column = ? AND position >= ?`
      ).run(targetColumn, targetPosition);

      // Move the task to the new column and position
      db.prepare(
        "UPDATE tasks SET column = ?, position = ? WHERE id = ?"
      ).run(targetColumn, targetPosition, taskId);
    }
  })();

  json(200, { success: true });
};
