/**
 * Shared middleware for everything under `/api`. This layout applies to all
 * nested routes; its `onRequest` handler runs before any endpoint handler
 * and is what enforces the in-memory per-IP rate limiter.
 *
 * Rejecting a request here calls `ev.json(429, ...)`, which both writes the
 * response and signals the Qwik City router to stop calling further
 * handlers -- so the endpoint code in `src/routes/api/data/index.ts` will
 * not run for blocked requests.
 */

import type { RequestHandler } from "@builder.io/qwik-city";
import {
  consume,
  getClientIp,
  setRateLimitHeaders,
} from "~/lib/rate-limit";

/**
 * Key used to share the computed `remaining` count with the endpoint
 * handler via the per-request `sharedMap`.
 */
export const RATE_LIMIT_REMAINING_KEY = "rateLimitRemaining";

export const onRequest: RequestHandler = (ev) => {
  const ip = getClientIp(ev);
  const result = consume(ip);

  // The `X-RateLimit-*` headers must be present on every response, whether
  // we end up allowing or blocking the request.
  setRateLimitHeaders(ev, result);

  if (!result.allowed) {
    // Blocked: tell the client when they may try again and stop the chain.
    ev.headers.set("Retry-After", String(result.resetIn));
    ev.json(429, { error: "Too Many Requests" });
    return;
  }

  // Allowed: stash the post-count remaining quota so the endpoint handler
  // can echo it back in the JSON body. The shared map is per-request and is
  // the recommended way to hand data from middleware to downstream handlers.
  ev.sharedMap.set(RATE_LIMIT_REMAINING_KEY, result.remaining);
};
