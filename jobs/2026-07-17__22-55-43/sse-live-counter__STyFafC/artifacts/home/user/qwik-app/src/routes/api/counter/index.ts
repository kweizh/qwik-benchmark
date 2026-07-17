import type { RequestHandler } from "@builder.io/qwik-city";
import { applyDelta, getCount } from "~/lib/counter-store.server";

// GET /api/counter -> current value as JSON: { "count": <integer> }
export const onGet: RequestHandler = async (requestEvent) => {
  requestEvent.json(200, { count: getCount() });
};

// POST /api/counter { "delta": <integer> } -> applies delta, broadcasts to
// all SSE subscribers, and responds with the updated value.
export const onPost: RequestHandler = async (requestEvent) => {
  const body = (await requestEvent.parseBody()) as { delta?: unknown };

  const delta = Number(body?.delta);
  if (!Number.isFinite(delta) || !Number.isInteger(delta)) {
    requestEvent.json(400, { error: "Body must be { delta: <integer> }" });
    return;
  }

  const count = applyDelta(delta);
  requestEvent.json(200, { count });
};
