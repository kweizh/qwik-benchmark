/**
 * In-memory, per-IP rate limiter for the JSON API.
 *
 * Implements a 5-request, 5-second rolling window. State is kept entirely in
 * a process-local `Map` so each IP has its own counter and reset time.
 *
 * IMPORTANT: This module is imported by the shared `onRequest` middleware
 * (in `src/routes/api/layout.tsx`) and by the `/status` page. Because Node
 * modules are singletons within a process, both call sites observe the same
 * `buckets` map.
 */

import type { RequestEventBase } from "@builder.io/qwik-city";

/** Maximum number of requests permitted per IP inside one window. */
export const RATE_LIMIT = 5;

/** Length of one rolling window in milliseconds. */
export const WINDOW_MS = 5_000;

interface Bucket {
  /** How many requests have already been counted inside the current window. */
  count: number;
  /** Wall-clock time (ms) when the current window started. */
  windowStart: number;
  /** Wall-clock time (ms) when the current window will expire. */
  resetAt: number;
}

/**
 * Per-IP counters. The keys are client IP addresses and the values track how
 * many requests that IP has already consumed in its current window.
 */
const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  /** Whether the request is allowed to proceed. */
  allowed: boolean;
  /** How many more requests the IP may issue inside the current window. */
  remaining: number;
  /** Seconds (non-negative integer) until the current window resets. */
  resetIn: number;
  /** Configured maximum number of requests per window. */
  limit: number;
}

/**
 * Consume one token for the given IP and update the bucket in place. Returns
 * the outcome (allowed/blocked) along with the values needed for the standard
 * `X-RateLimit-*` response headers.
 */
export function consume(ip: string): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(ip);

  // If we have no bucket, or the previous window has fully elapsed, start a
  // fresh one. This is what makes the limiter a "rolling" 5-second window.
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, windowStart: now, resetAt: now + WINDOW_MS };
    buckets.set(ip, bucket);
  }

  const limit = RATE_LIMIT;

  if (bucket.count >= limit) {
    // Already at the cap -> reject. `resetIn` must be a positive integer
    // (per the `Retry-After` contract) so we floor it at 1.
    const resetIn = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, resetIn, limit };
  }

  // Allowed: count this request and report how many tokens remain.
  bucket.count += 1;
  const remaining = limit - bucket.count;
  const resetIn = Math.max(0, Math.ceil((bucket.resetAt - now) / 1000));
  return { allowed: true, remaining, resetIn, limit };
}

/**
 * Read the current bucket without mutating it. Used by the `/status` page so
 * that peeking at the limit does not itself cost the viewer any quota.
 */
export function peek(ip: string): {
  remaining: number;
  resetIn: number;
  limit: number;
} {
  const now = Date.now();
  const bucket = buckets.get(ip);

  // No bucket yet, or the previous window expired -> full quota is available.
  if (!bucket || now >= bucket.resetAt) {
    return { remaining: RATE_LIMIT, resetIn: 0, limit: RATE_LIMIT };
  }

  const remaining = Math.max(0, RATE_LIMIT - bucket.count);
  const resetIn = Math.max(0, Math.ceil((bucket.resetAt - now) / 1000));
  return { remaining, resetIn, limit: RATE_LIMIT };
}

/**
 * Resolve the client IP from the incoming request. Honors `X-Forwarded-For`
 * (first address only) and falls back to whatever the underlying connection
 * reports via Qwik City's `clientConn.ip`.
 */
export function getClientIp(ev: RequestEventBase): string {
  const forwarded = ev.request.headers.get("x-forwarded-for");
  if (forwarded) {
    // X-Forwarded-For is a comma-separated list; the spec asks us to use the
    // first address in it.
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const connIp = ev.clientConn?.ip;
  if (connIp) return connIp;
  // Final fallback for tests/edge cases: an obviously-fake IP so the
  // limiter still groups requests in some deterministic way.
  return "0.0.0.0";
}

/**
 * Write the standard `X-RateLimit-*` headers onto the outgoing response.
 */
export function setRateLimitHeaders(
  ev: RequestEventBase,
  result: { limit: number; remaining: number; resetIn: number },
): void {
  ev.headers.set("X-RateLimit-Limit", String(result.limit));
  ev.headers.set("X-RateLimit-Remaining", String(result.remaining));
  ev.headers.set("X-RateLimit-Reset", String(result.resetIn));
}

/**
 * Exposed for tests / introspection only. Not used by the middleware.
 */
export const __testing = { buckets };
