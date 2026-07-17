import type { RequestHandler } from "@builder.io/qwik-city";
import { rateLimitStore, cleanExpiredKeys } from "./store";

export const onRequest: RequestHandler = async (requestEvent) => {
  const url = requestEvent.url;
  const pathname = url.pathname.replace(/\/$/, "");

  if (pathname === "/api/data") {
    const currentWindowId = Math.floor(Date.now() / 10000);
    cleanExpiredKeys(currentWindowId);

    // 1. Determine IP address
    let ip = "";
    const xForwardedFor = requestEvent.request.headers.get("x-forwarded-for");
    if (xForwardedFor) {
      const ips = xForwardedFor.split(",");
      if (ips.length > 0) {
        ip = ips[0].trim();
      }
    }
    if (!ip && requestEvent.clientConn?.ip) {
      ip = requestEvent.clientConn.ip;
    }
    if (!ip) {
      ip = "127.0.0.1";
    }

    // 2. Construct the key
    const key = `ratelimit:${ip}:${currentWindowId}`;

    // 3. Get and increment request count
    const currentCount = rateLimitStore.get(key) || 0;
    const nextCount = currentCount + 1;
    rateLimitStore.set(key, nextCount);

    // 4. Calculate remaining and reset
    const remaining = Math.max(0, 5 - nextCount);
    const resetTime = (currentWindowId + 1) * 10;

    // 5. Set response headers
    requestEvent.headers.set("X-RateLimit-Limit", "5");
    requestEvent.headers.set("X-RateLimit-Remaining", remaining.toString());
    requestEvent.headers.set("X-RateLimit-Reset", resetTime.toString());

    // 6. Check limit
    if (nextCount > 5) {
      requestEvent.json(429, { error: "Too Many Requests" });
      return; // Stop execution
    }
  }

  await requestEvent.next();
};
