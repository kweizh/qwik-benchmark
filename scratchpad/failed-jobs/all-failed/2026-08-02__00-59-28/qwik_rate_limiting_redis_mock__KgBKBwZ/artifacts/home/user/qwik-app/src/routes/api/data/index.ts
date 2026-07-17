import type { RequestHandler } from "@builder.io/qwik-city";

/**
 * GET /api/data
 * Returns a simple success response.
 * Rate limiting is handled by the server plugin (plugin.ts).
 */
export const onGet: RequestHandler = (ev) => {
  ev.json(200, { data: "Success" });
};
