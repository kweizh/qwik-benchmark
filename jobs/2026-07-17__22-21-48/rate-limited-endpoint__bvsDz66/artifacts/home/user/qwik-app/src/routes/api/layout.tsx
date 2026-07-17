import { Slot, component$ } from "@builder.io/qwik";
import type { RequestHandler } from "@builder.io/qwik-city";
import { consume, getClientIp, type RateLimitResult } from "../../lib/rate-limiter";

/**
 * Shared `onRequest` middleware that protects EVERY route under `/api/`.
 *
 * It enforces the in-memory, per-IP rate limiter for all routes below this
 * layout. When a client exceeds the limit it responds with 429 and stops the
 * chain so the endpoint handler never runs.
 */
export const onRequest: RequestHandler = (ev) => {
  const ip = getClientIp(ev);
  const result: RateLimitResult = consume(ip);

  // Share the computed result with the endpoint handlers below.
  ev.sharedMap.set("rateLimit", result);

  // Rate-limit headers are present on every /api response (allowed or blocked).
  ev.headers.set("X-RateLimit-Limit", String(result.limit));
  ev.headers.set("X-RateLimit-Remaining", String(result.remaining));
  ev.headers.set("X-RateLimit-Reset", String(result.reset));

  if (!result.allowed) {
    ev.headers.set("Retry-After", String(result.reset));
    // json() sends the response and stops the middleware chain.
    ev.json(429, { error: "Too Many Requests" });
  }
};

export default component$(() => {
  return <Slot />;
});