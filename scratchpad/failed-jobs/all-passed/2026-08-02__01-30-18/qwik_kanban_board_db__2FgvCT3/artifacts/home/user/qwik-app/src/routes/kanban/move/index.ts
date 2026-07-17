import type { RequestHandler } from '@builder.io/qwik-city';
import { db, type Task } from '../../../db';

export const onPost: RequestHandler = async ({ parseBody, json }) => {
  try {
    const body = (await parseBody()) as any;
    const { taskId, targetColumn, targetPosition } = body || {};

    if (taskId === undefined || targetColumn === undefined || targetPosition === undefined) {
      json(400, { error: 'taskId, targetColumn, and targetPosition are required' });
      return;
    }

    const id = Number(taskId);
    const pos = Number(targetPosition);

    if (isNaN(id) || isNaN(pos)) {
      json(400, { error: 'taskId and targetPosition must be numbers' });
      return;
    }

    if (targetColumn !== 'TODO' && targetColumn !== 'IN_PROGRESS' && targetColumn !== 'DONE') {
      json(400, { error: 'targetColumn must be one of TODO, IN_PROGRESS, DONE' });
      return;
    }

    const moveTransaction = db.transaction((tId: number, tCol: 'TODO' | 'IN_PROGRESS' | 'DONE', tPos: number) => {
      const task = db.prepare('SELECT id, title, column, position FROM tasks WHERE id = ?').get(tId) as Task | undefined;
      if (!task) {
        return { status: 404, error: 'Task not found' };
      }

      const C_src = task.column;
      const P_src = task.position;
      const C_dest = tCol;
      const P_dest = tPos;

      const destCountRow = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE column = ?').get(C_dest) as { count: number };
      const N_dest = destCountRow.count;

      if (C_src === C_dest) {
        if (P_dest < 0 || P_dest >= N_dest) {
          return { status: 400, error: 'targetPosition out of bounds' };
        }
      } else {
        if (P_dest < 0 || P_dest > N_dest) {
          return { status: 400, error: 'targetPosition out of bounds' };
        }
      }

      if (C_src === C_dest) {
        if (P_src === P_dest) {
          return { status: 200, success: true };
        }

        if (P_src < P_dest) {
          db.prepare(`
            UPDATE tasks
            SET position = position - 1
            WHERE column = ? AND position >= ? AND position <= ?
          `).run(C_src, P_src + 1, P_dest);
        } else {
          db.prepare(`
            UPDATE tasks
            SET position = position + 1
            WHERE column = ? AND position >= ? AND position <= ?
          `).run(C_src, P_dest, P_src - 1);
        }

        db.prepare('UPDATE tasks SET position = ? WHERE id = ?').run(P_dest, tId);
      } else {
        db.prepare(`
          UPDATE tasks
          SET position = position - 1
          WHERE column = ? AND position > ?
        `).run(C_src, P_src);

        db.prepare(`
          UPDATE tasks
          SET position = position + 1
          WHERE column = ? AND position >= ?
        `).run(C_dest, P_dest);

        db.prepare('UPDATE tasks SET column = ?, position = ? WHERE id = ?').run(C_dest, P_dest, tId);
      }

      return { status: 200, success: true };
    });

    const result = moveTransaction(id, targetColumn, pos);
    if (result.status === 200) {
      json(200, { success: true });
    } else {
      json(result.status, { error: result.error });
    }
  } catch (err: any) {
    json(500, { error: err.message });
  }
};
