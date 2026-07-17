import type { RequestHandler } from "@builder.io/qwik-city";
import { getCount, applyDelta } from "~/server/counter-store";

/**
 * Current-value endpoint: `GET /api/counter`
 *
 * Responds with status 200 and JSON body `{ "count": <integer> }` containing
 * the current shared counter value.
 */
export const onGet: RequestHandler = async (requestEvent) => {
  requestEvent.json(200, { count: getCount() });
};

/**
 * Mutation endpoint: `POST /api/counter`
 *
 * Request body: JSON `{ "delta": <integer> }` (delta may be negative).
 * Applies the delta to the shared counter, broadcasts the new value to all
 * connected SSE subscribers, and responds with status 200 and JSON body
 * `{ "count": <integer> }` containing the updated value.
 */
export const onPost: RequestHandler = async (requestEvent) => {
  const body = (await requestEvent.parseBody()) as { delta?: unknown } | null;

  const rawDelta = body?.delta;
  const delta = typeof rawDelta === "number" && Number.isFinite(rawDelta)
    ? Math.trunc(rawDelta)
    : 0;

  const count = applyDelta(delta);

  requestEvent.json(200, { count });
};