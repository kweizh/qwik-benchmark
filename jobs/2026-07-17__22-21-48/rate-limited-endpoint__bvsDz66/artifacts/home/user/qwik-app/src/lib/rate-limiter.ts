import type { RequestEventBase } from "@builder.io/qwik-city";

/**
 * In-memory, per-IP rate limiter.
 *
 * All state lives in process memory inside the `store` Map below. This module
 * is imported by both the `/api` shared middleware (which *consumes* quota) and
 * the `/status` demo page (which only *peeks*). Because it is a single module
 * instance shared across the server, both observe the exact same counters.
 *
 * Policy: at most RATE_LIMIT requests per rolling RATE_LIMIT_WINDOW_MS window
 * per client IP.
 */

export const RATE_LIMIT = 5;
export const RATE_LIMIT_WINDOW_MS = 5000;

interface IpState {
  /** Sorted list of request timestamps (ms) within the current window. */
  timestamps: number[];
}

/** Shared server-side state. Plain Map kept in module scope. */
const store = new Map<string, IpState>();

export interface RateLimitResult {
  /** Whether the request that produced this result was allowed. */
  allowed: boolean;
  /** Requests still allowed for this IP in the current window. */
  remaining: number;
  /** Maximum number of requests allowed per window. */
  limit: number;
  /** Whole, non-negative number of seconds until the window resets. */
  reset: number;
}

/**
 * Resolve the client IP for a request.
 *
 * Uses the first address in the `X-Forwarded-For` header when present, falling
 * back to the connection's client IP. Rate limiting is strictly per-IP.
 */
export function getClientIp(ev: RequestEventBase): string {
  const xff = ev.request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return ev.clientConn.ip ?? "unknown";
}

function secsUntilReset(now: number, oldestInWindow: number | undefined): number {
  if (oldestInWindow === undefined) {
    // No requests in the window yet: a full window is available.
    return Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);
  }
  const ms = oldestInWindow + RATE_LIMIT_WINDOW_MS - now;
  return Math.max(1, Math.ceil(ms / 1000));
}

/**
 * Consume one unit of quota for the given IP. This mutates state and must be
 * called exactly once per HTTP request (only by the middleware).
 */
export function consume(ip: string): RateLimitResult {
  const now = Date.now();
  let state = store.get(ip);
  if (!state) {
    state = { timestamps: [] };
    store.set(ip, state);
  }

  // Drop timestamps that have aged out of the rolling window (front is oldest).
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  while (state.timestamps.length > 0 && state.timestamps[0] <= cutoff) {
    state.timestamps.shift();
  }

  if (state.timestamps.length < RATE_LIMIT) {
    // Allowed: record this request and report remaining quota after counting.
    state.timestamps.push(now);
    const remaining = RATE_LIMIT - state.timestamps.length;
    const reset = secsUntilReset(now, state.timestamps[0]);
    return { allowed: true, remaining, limit: RATE_LIMIT, reset };
  }

  // Blocked: do not record. Report when the oldest in-window request expires.
  const reset = secsUntilReset(now, state.timestamps[0]);
  return { allowed: false, remaining: 0, limit: RATE_LIMIT, reset };
}

/**
 * Peek at the current quota for the given IP without consuming anything.
 * Used by the `/status` page so that viewing it never changes any quota.
 */
export function peek(ip: string): RateLimitResult {
  const now = Date.now();
  const state = store.get(ip);
  const cutoff = now - RATE_LIMIT_WINDOW_MS;

  let count = 0;
  let oldest: number | undefined;
  if (state) {
    for (const ts of state.timestamps) {
      if (ts > cutoff) {
        count++;
        if (oldest === undefined || ts < oldest) {
          oldest = ts;
        }
      }
    }
  }

  const remaining = Math.max(0, RATE_LIMIT - count);
  const reset = secsUntilReset(now, oldest);
  return { allowed: true, remaining, limit: RATE_LIMIT, reset };
}