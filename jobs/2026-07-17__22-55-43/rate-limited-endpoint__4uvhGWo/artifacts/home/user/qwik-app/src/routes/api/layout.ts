import type { RequestHandler } from "@builder.io/qwik-city";
import { consume, getClientIp } from "~/lib/rate-limiter";

/**
 * Shared middleware for every route under `/api/`.
 *
 * Enforces an in-memory, per-IP rate limit (5 requests / rolling 5s window).
 * - Always sets the `X-RateLimit-*` response headers.
 * - When the limit is exceeded, responds with 429 + `Retry-After` and stops
 *   the request chain so downstream `onGet`/`onPost` handlers never run.
 * - Stashes the result on `sharedMap` so downstream handlers can reuse it
 *   without consuming quota a second time.
 */
export const onRequest: RequestHandler = async (requestEvent) => {
  const { request, clientConn, headers, sharedMap } = requestEvent;

  const ip = getClientIp(request, clientConn.ip);
  const result = consume(ip);

  sharedMap.set("rateLimit", result);

  headers.set("X-RateLimit-Limit", String(result.limit));
  headers.set("X-RateLimit-Remaining", String(result.remaining));
  headers.set("X-RateLimit-Reset", String(result.resetSeconds));

  if (!result.allowed) {
    headers.set("Retry-After", String(result.retryAfterSeconds ?? result.resetSeconds));
    // `json()` throws an internal abort signal, halting the middleware chain
    // so the endpoint handler below never executes.
    throw requestEvent.json(429, {
      error: "Too Many Requests",
      message: `Rate limit exceeded. Try again in ${result.retryAfterSeconds ?? result.resetSeconds}s.`,
    });
  }
};
