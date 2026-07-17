// src/lib/limiter.ts
import type { RequestEventCommon } from "@builder.io/qwik-city";

// Map of IP address -> array of timestamps (number)
export const ipCache = new Map<string, number[]>();

export interface LimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // seconds until reset
  retryAfter?: number; // seconds to wait before next allowed request
}

export function getClientIp(event: RequestEventCommon): string {
  const xForwardedFor = event.request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const parts = xForwardedFor.split(",");
    const firstIp = parts[0].trim();
    if (firstIp) {
      return firstIp;
    }
  }
  return event.clientConn?.ip || "127.0.0.1";
}

export function checkLimit(ip: string, consume: boolean = true): LimitResult {
  const limit = 5;
  const windowMs = 5000; // 5 seconds
  const now = Date.now();

  let timestamps = ipCache.get(ip) || [];

  // Filter out timestamps older than windowMs
  timestamps = timestamps.filter((t) => now - t < windowMs);

  const count = timestamps.length;
  const allowed = count < limit;

  if (allowed) {
    if (consume) {
      timestamps.push(now);
      ipCache.set(ip, timestamps);
    }
    const currentCount = consume ? count + 1 : count;
    const remaining = limit - currentCount;
    
    // Calculate reset: time until the oldest request expires (which opens up a slot)
    let reset = 0;
    if (timestamps.length > 0) {
      const oldest = timestamps[0];
      reset = Math.max(0, Math.ceil((oldest + windowMs - now) / 1000));
    }

    return {
      allowed: true,
      limit,
      remaining,
      reset
    };
  } else {
    // Blocked
    const remaining = 0;
    const oldest = timestamps[0];
    const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    const reset = retryAfter;

    // Make sure we update the cleaned timestamps in the cache
    ipCache.set(ip, timestamps);

    return {
      allowed: false,
      limit,
      remaining,
      reset,
      retryAfter
    };
  }
}
