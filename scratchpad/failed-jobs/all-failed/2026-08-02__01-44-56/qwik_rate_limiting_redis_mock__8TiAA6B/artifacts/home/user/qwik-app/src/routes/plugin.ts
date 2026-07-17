import type { RequestHandler } from "@builder.io/qwik-city";
import { mockRedisStore } from "../lib/store";

export const onRequest: RequestHandler = async (event) => {
  const pathname = event.url.pathname;
  if (pathname === "/api/data" || pathname === "/api/data/") {
    let ip = "127.0.0.1";
    const xForwardedFor = event.request.headers.get("x-forwarded-for");
    if (xForwardedFor) {
      const firstIp = xForwardedFor.split(",")[0].trim();
      if (firstIp) {
        ip = firstIp;
      }
    } else if (event.clientConn?.ip) {
      ip = event.clientConn.ip;
    }

    const nowMs = Date.now();
    const windowId = Math.floor(nowMs / 10000);
    const resetTime = (windowId + 1) * 10;
    const limit = 5;

    const key = `ratelimit:${ip}:${windowId}`;
    const count = mockRedisStore.incr(key);
    const remaining = Math.max(0, limit - count);

    event.headers.set("X-RateLimit-Limit", String(limit));
    event.headers.set("X-RateLimit-Remaining", String(remaining));
    event.headers.set("X-RateLimit-Reset", String(resetTime));

    if (count > limit) {
      event.json(429, { error: "Too Many Requests" });
      return;
    }
  }
};
