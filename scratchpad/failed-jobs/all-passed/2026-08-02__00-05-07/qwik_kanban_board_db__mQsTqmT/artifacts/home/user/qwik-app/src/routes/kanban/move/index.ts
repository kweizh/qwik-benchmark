import type { RequestHandler } from "@builder.io/qwik-city";
import { moveTask } from "~/lib/db";

function extractField(body: unknown, key: string): unknown {
  if (body == null) return undefined;

  if (typeof body === "object") {
    if (typeof (body as any).get === "function") {
      return (body as any).get(key);
    }
    return (body as Record<string, unknown>)[key];
  }

  return undefined;
}

export const onPost: RequestHandler = async (requestEvent) => {
  const body = await requestEvent.parseBody();

  const rawTaskId = extractField(body, "taskId");
  const rawTargetColumn = extractField(body, "targetColumn");
  const rawTargetPosition = extractField(body, "targetPosition");

  const taskId = Number(rawTaskId);
  const targetColumn = String(rawTargetColumn ?? "");
  const targetPosition = Number(rawTargetPosition);

  if (!Number.isInteger(taskId) || rawTaskId === undefined) {
    requestEvent.json(404, { error: "Task not found" });
    return;
  }

  if (!Number.isFinite(targetPosition) && rawTargetPosition !== undefined) {
    requestEvent.json(400, { error: "Invalid targetPosition" });
    return;
  }

  const result = moveTask(taskId, targetColumn, targetPosition);

  if (!result.ok) {
    requestEvent.json(result.status ?? 400, { error: result.error });
    return;
  }

  requestEvent.json(200, { success: true });
};
