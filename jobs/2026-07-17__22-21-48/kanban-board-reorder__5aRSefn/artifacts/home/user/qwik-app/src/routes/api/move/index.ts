import type { RequestHandler } from "@builder.io/qwik-city";
import { HttpError, moveCard } from "~/db/board";
import { validateMoveBody } from "~/lib/board";

export const onPost: RequestHandler = async ({ json, request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    json(400, { error: "Invalid JSON body" });
    return;
  }

  let cardId: number;
  let toColumn: "todo" | "doing" | "done";
  let toIndex: number;
  try {
    const parsed = validateMoveBody(body);
    cardId = parsed.cardId;
    toColumn = parsed.toColumn;
    toIndex = parsed.toIndex;
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 400;
    json(status, { error: (err as Error).message });
    return;
  }

  try {
    const board = moveCard(cardId, toColumn, toIndex);
    json(200, board);
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 400;
    json(status, { error: (err as Error).message });
  }
};