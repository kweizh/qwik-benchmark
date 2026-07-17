import type { RequestHandler } from "@builder.io/qwik-city";
import { redisStore } from "../lib/store";

export const onRequest: RequestHandler = async (event) => {
  const pathname = event.url.pathname.replace(/\/$/, "");

  if (pathname === "/api/data") {
    // 1. Determine IP address
    const xForwardedFor = event.request.headers.get("X-Forwarded-For");
    let ip = "127.0.0.1";
    if (xForwardedFor) {
      const firstIp = xForwardedFor.split(",")[0].trim();
      if (firstIp) {
        ip = firstIp;
      }
    } else if (event.clientConn?.ip) {
      ip = event.clientConn.ip;
    }

    // 2. Calculate window ID and reset time
    const windowId = Math.floor(Date.now() / 10000);
    const resetTime = (windowId + 1) * 10;
    const key = `ratelimit:${ip}:${windowId}`;

    // 3. Increment request count
    const count = redisStore.incr(key);

    // 4. Calculate remaining requests
    const limit = 5;
    const remaining = Math.max(0, limit - count);

    // 5. Set response headers
    event.headers.set("X-RateLimit-Limit", String(limit));
    event.headers.set("X-RateLimit-Remaining", String(remaining));
    event.headers.set("X-RateLimit-Reset", String(resetTime));

    // 6. Check if rate limit is exceeded
    if (count > limit) {
      event.json(429, { error: "Too Many Requests" });
      return;
    }
  }
};
