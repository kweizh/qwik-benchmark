import type { RequestHandler } from "@builder.io/qwik-city";
import { mockRedis } from "../../../mock-redis-store";

/**
 * GET /api/debug-store
 * Returns the current state of the in-memory mock Redis store.
 */
export const onGet: RequestHandler = (ev) => {
  ev.json(200, { keys: mockRedis.getAll() });
};
