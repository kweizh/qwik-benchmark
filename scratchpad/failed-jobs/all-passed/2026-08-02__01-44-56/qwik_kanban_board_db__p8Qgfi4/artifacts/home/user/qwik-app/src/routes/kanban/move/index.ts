import { type RequestHandler } from "@builder.io/qwik-city";
import {
  moveTask,
  TaskNotFoundError,
  InvalidColumnError,
  OutOfBoundsError,
} from "../../../db";

export const onPost: RequestHandler = async (requestEvent) => {
  try {
    let taskId: any;
    let targetColumn: any;
    let targetPosition: any;

    const body = (await requestEvent.parseBody()) as any;
    if (body && typeof body === "object") {
      taskId = body.taskId;
      targetColumn = body.targetColumn;
      targetPosition = body.targetPosition;
    }

    if (taskId === undefined || targetColumn === undefined || targetPosition === undefined) {
      try {
        const clone = requestEvent.request.clone();
        const json = await clone.json();
        if (json) {
          if (taskId === undefined) taskId = json.taskId;
          if (targetColumn === undefined) targetColumn = json.targetColumn;
          if (targetPosition === undefined) targetPosition = json.targetPosition;
        }
      } catch {
        // ignore
      }
    }

    if (taskId === undefined || targetColumn === undefined || targetPosition === undefined) {
      requestEvent.json(400, { error: "taskId, targetColumn, and targetPosition are required" });
      return;
    }

    const tId = Number(taskId);
    const tPos = Number(targetPosition);

    if (isNaN(tId) || isNaN(tPos)) {
      requestEvent.json(400, { error: "taskId and targetPosition must be numbers" });
      return;
    }

    moveTask(tId, targetColumn, tPos);
    requestEvent.json(200, { success: true });
  } catch (err: any) {
    if (err instanceof TaskNotFoundError) {
      requestEvent.json(404, { error: err.message });
    } else if (err instanceof InvalidColumnError || err instanceof OutOfBoundsError) {
      requestEvent.json(400, { error: err.message });
    } else {
      requestEvent.json(500, { error: err.message });
    }
  }
};
