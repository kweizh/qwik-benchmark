import type { RequestHandler } from '@builder.io/qwik-city';
import { db } from '../../../db';

export const onPost: RequestHandler = async ({ request, parseBody, json }) => {
  try {
    let taskId: any;
    let targetColumn: any;
    let targetPosition: any;

    try {
      const body = await parseBody() as any;
      if (body && typeof body === 'object') {
        taskId = body.taskId;
        targetColumn = body.targetColumn;
        targetPosition = body.targetPosition;
      }
    } catch {
      // fallback
    }

    if (taskId === undefined || targetColumn === undefined || targetPosition === undefined) {
      try {
        const jsonBody = await request.json();
        if (jsonBody && typeof jsonBody === 'object') {
          if (taskId === undefined) taskId = jsonBody.taskId;
          if (targetColumn === undefined) targetColumn = jsonBody.targetColumn;
          if (targetPosition === undefined) targetPosition = jsonBody.targetPosition;
        }
      } catch {
        // fallback
      }
    }

    // Parse and validate types
    const parsedTaskId = Number(taskId);
    const parsedTargetPosition = Number(targetPosition);

    if (isNaN(parsedTaskId) || isNaN(parsedTargetPosition)) {
      json(400, { error: 'taskId and targetPosition must be numbers' });
      return;
    }

    if (typeof targetColumn !== 'string') {
      json(400, { error: 'targetColumn must be a string' });
      return;
    }

    if (targetColumn !== 'TODO' && targetColumn !== 'IN_PROGRESS' && targetColumn !== 'DONE') {
      json(400, { error: 'targetColumn must be one of TODO, IN_PROGRESS, DONE' });
      return;
    }

    if (parsedTargetPosition < 0) {
      json(400, { error: 'targetPosition cannot be negative' });
      return;
    }

    // Execute transaction
    const result = db.transaction(() => {
      // 1. Fetch current task
      const task = db.prepare('SELECT id, column, position FROM tasks WHERE id = ?').get(parsedTaskId) as { id: number, column: string, position: number } | undefined;
      if (!task) {
        return { status: 404, message: 'Task not found' };
      }

      const { column: srcColumn, position: srcPosition } = task;

      // 2. Count tasks in target column
      const countRow = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE column = ?').get(targetColumn) as { count: number };
      const targetCount = countRow.count;

      if (srcColumn === targetColumn) {
        // Moving within the same column
        if (parsedTargetPosition > targetCount - 1) {
          return { status: 400, message: 'targetPosition is out of bounds' };
        }

        if (srcPosition === parsedTargetPosition) {
          return { status: 200 };
        }

        if (srcPosition < parsedTargetPosition) {
          // Decrement positions in [srcPosition + 1, targetPosition]
          db.prepare(`
            UPDATE tasks 
            SET position = position - 1 
            WHERE column = ? AND position >= ? AND position <= ?
          `).run(srcColumn, srcPosition + 1, parsedTargetPosition);
        } else {
          // Increment positions in [targetPosition, srcPosition - 1]
          db.prepare(`
            UPDATE tasks 
            SET position = position + 1 
            WHERE column = ? AND position >= ? AND position <= ?
          `).run(srcColumn, parsedTargetPosition, srcPosition - 1);
        }

        // Set moved task's position
        db.prepare('UPDATE tasks SET position = ? WHERE id = ?').run(parsedTargetPosition, parsedTaskId);

      } else {
        // Moving to a different column
        if (parsedTargetPosition > targetCount) {
          return { status: 400, message: 'targetPosition is out of bounds' };
        }

        // Decrement positions in source column for tasks with position > srcPosition
        db.prepare(`
          UPDATE tasks 
          SET position = position - 1 
          WHERE column = ? AND position > ?
        `).run(srcColumn, srcPosition);

        // Increment positions in target column for tasks with position >= targetPosition
        db.prepare(`
          UPDATE tasks 
          SET position = position + 1 
          WHERE column = ? AND position >= ?
        `).run(targetColumn, parsedTargetPosition);

        // Set moved task's column and position
        db.prepare('UPDATE tasks SET column = ?, position = ? WHERE id = ?').run(targetColumn, parsedTargetPosition, parsedTaskId);
      }

      return { status: 200 };
    })();

    if (result.status !== 200) {
      json(result.status, { error: result.message });
      return;
    }

    json(200, { success: true });
  } catch (error: any) {
    json(500, { error: error.message || 'Internal Server Error' });
  }
};
