import { mockRedis } from "./mock-redis";

/** Fixed-window size, in seconds. */
export const WINDOW_SIZE_SECONDS = 10;

/** Maximum number of requests allowed per window, per IP. */
export const RATE_LIMIT = 5;

/**
 * Resolves the client's IP address for a request, in priority order:
 *   1. The first address in the `X-Forwarded-For` header, if present.
 *   2. `clientConn.ip`, if present.
 *   3. `127.0.0.1` as a fallback default.
 */
export function getClientIp(request: Request, clientConnIp?: string): string {
  const forwardedFor = request.headers.get("X-Forwarded-For");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  if (clientConnIp) {
    return clientConnIp;
  }

  return "127.0.0.1";
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Unix timestamp (seconds) at which the current window resets. */
  reset: number;
}

/**
 * Fixed-window rate limiter. Every call counts as one request against the
 * current window for the given `ip`.
 */
export function checkRateLimit(ip: string): RateLimitResult {
  const windowId = Math.floor(Date.now() / (WINDOW_SIZE_SECONDS * 1000));

  // Clean up any keys left over from previous, expired windows.
  mockRedis.cleanup(windowId);

  const key = `ratelimit:${ip}:${windowId}`;
  const count = mockRedis.increment(key);

  const remaining = Math.max(0, RATE_LIMIT - count);
  const reset = (windowId + 1) * WINDOW_SIZE_SECONDS;

  return {
    allowed: count <= RATE_LIMIT,
    limit: RATE_LIMIT,
    remaining,
    reset,
  };
}
