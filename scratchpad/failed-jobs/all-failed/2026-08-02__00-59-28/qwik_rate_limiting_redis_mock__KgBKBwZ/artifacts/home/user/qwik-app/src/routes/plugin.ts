import type { RequestHandler } from "@builder.io/qwik-city";
import { mockRedis } from "../mock-redis-store";

const RATE_LIMIT = 5;
const WINDOW_SECONDS = 10;

/**
 * Server plugin — runs as middleware before every request.
 * Applies rate limiting to the `/api/data` endpoint.
 */
export const onRequest: RequestHandler = (ev) => {
  // Only apply rate limiting to /api/data
  if (ev.pathname !== "/api/data") {
    return;
  }

  const now = Date.now();
  const windowId = Math.floor(now / (WINDOW_SECONDS * 1000));
  const resetTimestamp = (windowId + 1) * WINDOW_SECONDS;

  // Determine client IP
  const xForwardedFor = ev.request.headers.get("X-Forwarded-For");
  let clientIp: string;
  if (xForwardedFor) {
    // Take the first IP in the X-Forwarded-For list
    clientIp = xForwardedFor.split(",")[0].trim();
  } else if (ev.clientConn.ip) {
    clientIp = ev.clientConn.ip;
  } else {
    clientIp = "127.0.0.1";
  }

  // Clean up expired keys
  mockRedis.cleanupExpired(windowId);

  // Build the rate-limit key
  const key = `ratelimit:${clientIp}:${windowId}`;

  // Increment the counter
  const currentCount = mockRedis.incr(key);

  // Calculate remaining
  const remaining = Math.max(0, RATE_LIMIT - currentCount);

  // Set rate-limit headers on every response
  ev.headers.set("X-RateLimit-Limit", String(RATE_LIMIT));
  ev.headers.set("X-RateLimit-Remaining", String(remaining));
  ev.headers.set("X-RateLimit-Reset", String(resetTimestamp));

  // If over the limit, block the request
  if (currentCount > RATE_LIMIT) {
    // Ensure remaining is 0 for rate-limited responses
    ev.headers.set("X-RateLimit-Remaining", "0");
    throw ev.json(429, { error: "Too Many Requests" });
  }
};
