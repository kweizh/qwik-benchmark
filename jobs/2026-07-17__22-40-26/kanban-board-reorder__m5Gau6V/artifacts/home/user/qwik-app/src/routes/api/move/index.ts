import type { RequestHandler } from "@builder.io/qwik-city";
import {
  BadRequestError,
  COLUMNS,
  NotFoundError,
  moveCard,
  type ColumnKey,
} from "~/lib/db";

export const onPost: RequestHandler = async ({ request, json, status }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    status(400);
    json(400, { error: "invalid JSON body" });
    return;
  }

  if (!body || typeof body !== "object") {
    status(400);
    json(400, { error: "missing body" });
    return;
  }

  const { cardId, toColumn, toIndex } = body as Record<string, unknown>;

  if (typeof cardId !== "number" || !Number.isInteger(cardId)) {
    status(400);
    json(400, { error: "cardId must be an integer" });
    return;
  }
  if (typeof toColumn !== "string" || !COLUMNS.includes(toColumn as ColumnKey)) {
    status(400);
    json(400, { error: "toColumn must be one of todo|doing|done" });
    return;
  }
  if (typeof toIndex !== "number" || !Number.isFinite(toIndex)) {
    status(400);
    json(400, { error: "toIndex must be a number" });
    return;
  }

  try {
    const board = moveCard(cardId, toColumn, toIndex);
    status(200);
    json(200, board);
  } catch (err) {
    if (err instanceof NotFoundError) {
      status(404);
      json(404, { error: err.message });
      return;
    }
    if (err instanceof BadRequestError) {
      status(400);
      json(400, { error: err.message });
      return;
    }
    throw err;
  }
};
