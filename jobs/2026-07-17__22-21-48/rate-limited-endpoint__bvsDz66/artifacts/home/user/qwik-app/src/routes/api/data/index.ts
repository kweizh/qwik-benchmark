import type { RequestHandler } from "@builder.io/qwik-city";
import type { RateLimitResult } from "../../../lib/rate-limiter";

/**
 * JSON API endpoint protected by the shared `/api` layout middleware.
 *
 * The middleware has already consumed one unit of quota, set the
 * `X-RateLimit-*` response headers, and stored the result in `sharedMap`.
 * Blocked requests never reach here (the middleware responds with 429).
 */

export const onGet: RequestHandler = (ev) => {
  const result = ev.sharedMap.get("rateLimit") as RateLimitResult;
  ev.json(200, { method: "GET", remaining: result.remaining });
};

export const onPost: RequestHandler = (ev) => {
  const result = ev.sharedMap.get("rateLimit") as RateLimitResult;
  ev.json(200, { method: "POST", remaining: result.remaining });
};