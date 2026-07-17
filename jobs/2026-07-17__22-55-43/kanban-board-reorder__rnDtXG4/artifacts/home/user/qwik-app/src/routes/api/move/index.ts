import type { RequestHandler } from "@builder.io/qwik-city";
import { COLUMNS, moveCard } from "~/lib/db";

export const onPost: RequestHandler = async (requestEvent) => {
  let body: unknown;
  try {
    body = await requestEvent.parseBody();
  } catch {
    requestEvent.json(400, { error: "invalid_body" });
    return;
  }

  if (typeof body !== "object" || body === null) {
    requestEvent.json(400, { error: "invalid_body" });
    return;
  }

  const { cardId, toColumn, toIndex } = body as Record<string, unknown>;

  if (
    typeof cardId !== "number" ||
    !Number.isInteger(cardId) ||
    typeof toColumn !== "string" ||
    !COLUMNS.includes(toColumn as any) ||
    typeof toIndex !== "number" ||
    !Number.isInteger(toIndex)
  ) {
    requestEvent.json(400, { error: "invalid_request" });
    return;
  }

  const result = moveCard(cardId, toColumn, toIndex);

  if (!result.ok) {
    if (result.error === "not_found") {
      requestEvent.json(404, { error: "card_not_found" });
      return;
    }
    requestEvent.json(400, { error: "invalid_request" });
    return;
  }

  requestEvent.json(200, result.board);
};
