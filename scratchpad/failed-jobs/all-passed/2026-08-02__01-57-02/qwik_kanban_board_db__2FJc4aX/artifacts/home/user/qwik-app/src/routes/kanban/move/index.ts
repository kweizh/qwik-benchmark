import type { RequestHandler } from "@builder.io/qwik-city";
import db, { Task } from "../../../lib/db";

export const onPost: RequestHandler = async (ev) => {
  try {
    let body: any = null;
    try {
      body = await ev.parseBody();
    } catch {
      // ignore
    }
    if (!body) {
      try {
        body = await ev.request.json();
      } catch {
        // ignore
      }
    }
    if (!body) {
      try {
        const formData = await ev.request.formData();
        body = Object.fromEntries(formData.entries());
      } catch {
        // ignore
      }
    }

    let taskId = body?.taskId;
    const targetColumn = body?.targetColumn;
    let targetPosition = body?.targetPosition;

    if (typeof taskId === "string") {
      taskId = Number(taskId);
    }
    if (typeof targetPosition === "string") {
      targetPosition = Number(targetPosition);
    }

    if (typeof taskId !== "number" || isNaN(taskId)) {
      ev.json(400, { error: "taskId must be a valid number" });
      return;
    }
    if (typeof targetPosition !== "number" || isNaN(targetPosition)) {
      ev.json(400, { error: "targetPosition must be a valid number" });
      return;
    }
    if (typeof targetColumn !== "string" || !["TODO", "IN_PROGRESS", "DONE"].includes(targetColumn)) {
      ev.json(400, { error: "targetColumn must be one of 'TODO', 'IN_PROGRESS', 'DONE'" });
      return;
    }

    const result = db.transaction((id: number, cDest: "TODO" | "IN_PROGRESS" | "DONE", pDest: number) => {
      // 1. Get the task
      const getStmt = db.prepare("SELECT id, title, column, position FROM tasks WHERE id = ?");
      const task = getStmt.get(id) as Task | undefined;
      if (!task) {
        return { status: 404, error: "Task not found" };
      }

      const cSrc = task.column;
      const pSrc = task.position;

      // 2. Validate targetColumn (already done, but double check constraint)
      if (!["TODO", "IN_PROGRESS", "DONE"].includes(cDest)) {
        return { status: 400, error: "Invalid target column" };
      }

      // 3. Get counts to validate targetPosition
      const countSrcStmt = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE column = ?");
      const countSrc = (countSrcStmt.get(cSrc) as { count: number }).count;

      let countDest = countSrc;
      if (cSrc !== cDest) {
        const countDestStmt = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE column = ?");
        countDest = (countDestStmt.get(cDest) as { count: number }).count;
      }

      // If moving within same column, targetPosition must be in [0, countSrc - 1]
      // If moving to different column, targetPosition must be in [0, countDest]
      if (cSrc === cDest) {
        if (pDest < 0 || pDest > countSrc - 1) {
          return { status: 400, error: "Target position out of bounds" };
        }
      } else {
        if (pDest < 0 || pDest > countDest) {
          return { status: 400, error: "Target position out of bounds" };
        }
      }

      // 4. Perform updates
      if (cSrc === cDest) {
        if (pSrc === pDest) {
          return { status: 200 };
        }
        if (pSrc < pDest) {
          const updateStmt = db.prepare(
            "UPDATE tasks SET position = position - 1 WHERE column = ? AND position >= ? AND position <= ?"
          );
          updateStmt.run(cSrc, pSrc + 1, pDest);
        } else {
          const updateStmt = db.prepare(
            "UPDATE tasks SET position = position + 1 WHERE column = ? AND position >= ? AND position <= ?"
          );
          updateStmt.run(cSrc, pDest, pSrc - 1);
        }
        const updateTaskStmt = db.prepare("UPDATE tasks SET position = ? WHERE id = ?");
        updateTaskStmt.run(pDest, id);
      } else {
        const decStmt = db.prepare("UPDATE tasks SET position = position - 1 WHERE column = ? AND position > ?");
        decStmt.run(cSrc, pSrc);

        const incStmt = db.prepare("UPDATE tasks SET position = position + 1 WHERE column = ? AND position >= ?");
        incStmt.run(cDest, pDest);

        const updateTaskStmt = db.prepare("UPDATE tasks SET column = ?, position = ? WHERE id = ?");
        updateTaskStmt.run(cDest, pDest, id);
      }

      return { status: 200 };
    })(taskId, targetColumn as "TODO" | "IN_PROGRESS" | "DONE", targetPosition);

    if (result.status !== 200) {
      ev.json(result.status, { error: result.error });
      return;
    }

    ev.json(200, { success: true });
  } catch (err: any) {
    ev.json(500, { error: err.message });
  }
};
