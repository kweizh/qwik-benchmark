/**
 * In-memory, per-IP sliding-window rate limiter.
 *
 * State lives entirely in process memory (a module-scoped `Map`), so it is
 * shared by every module that imports this file within the same server
 * process (e.g. the `/api` middleware and the `/status` page).
 *
 * No external service, database, or network access is used.
 */

/** Maximum number of requests allowed per client within the rolling window. */
export const RATE_LIMIT = 5;

/** Length of the rolling window, in milliseconds. */
export const WINDOW_MS = 5_000;

interface Bucket {
  /** Timestamps (ms since epoch) of requests counted within the current window. */
  timestamps: number[];
}

/** Shared, module-scoped, in-memory state keyed by client IP. */
const buckets = new Map<string, Bucket>();

/** Remove timestamps that have fallen outside of the rolling window. */
function prune(timestamps: number[], now: number): void {
  while (timestamps.length > 0 && now - timestamps[0] >= WINDOW_MS) {
    timestamps.shift();
  }
}

/** Seconds remaining until the oldest recorded request expires from the window. */
function resetSecondsFor(timestamps: number[], now: number): number {
  if (timestamps.length === 0) return 0;
  const oldest = timestamps[0];
  const msLeft = WINDOW_MS - (now - oldest);
  return Math.max(0, Math.ceil(msLeft / 1000));
}

export interface RateLimitResult {
  allowed: boolean;
  /** Requests still allowed for this client in the current window. */
  remaining: number;
  /** The configured limit (requests per window). */
  limit: number;
  /** Seconds until the window resets (i.e. until at least one slot frees up). */
  resetSeconds: number;
  /** Only present when `allowed` is false; seconds the client should wait before retrying. */
  retryAfterSeconds?: number;
}

/**
 * Records a request for `ip` and returns whether it is allowed.
 * This mutates state and must be called exactly once per incoming HTTP request.
 */
export function consume(ip: string): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(ip, bucket);
  }

  prune(bucket.timestamps, now);

  if (bucket.timestamps.length >= RATE_LIMIT) {
    const resetSeconds = Math.max(1, resetSecondsFor(bucket.timestamps, now));
    return {
      allowed: false,
      remaining: 0,
      limit: RATE_LIMIT,
      resetSeconds,
      retryAfterSeconds: resetSeconds,
    };
  }

  bucket.timestamps.push(now);
  const remaining = Math.max(0, RATE_LIMIT - bucket.timestamps.length);

  return {
    allowed: true,
    remaining,
    limit: RATE_LIMIT,
    resetSeconds: resetSecondsFor(bucket.timestamps, now),
  };
}

/**
 * Reads the current state for `ip` WITHOUT counting a request against it.
 * Safe to call from read-only views like the `/status` page.
 */
export function peek(ip: string): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || bucket.timestamps.length === 0) {
    return { allowed: true, remaining: RATE_LIMIT, limit: RATE_LIMIT, resetSeconds: 0 };
  }

  // Pruning expired entries is cleanup, not consumption of quota.
  prune(bucket.timestamps, now);
  const remaining = Math.max(0, RATE_LIMIT - bucket.timestamps.length);

  return {
    allowed: remaining > 0,
    remaining,
    limit: RATE_LIMIT,
    resetSeconds: resetSecondsFor(bucket.timestamps, now),
  };
}

/**
 * Resolves the client IP from the `X-Forwarded-For` header (first entry in the
 * comma-separated list) when present, otherwise falls back to the connection's
 * client IP.
 */
export function getClientIp(request: Request, connectionIp?: string | null): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return connectionIp || "unknown";
}
