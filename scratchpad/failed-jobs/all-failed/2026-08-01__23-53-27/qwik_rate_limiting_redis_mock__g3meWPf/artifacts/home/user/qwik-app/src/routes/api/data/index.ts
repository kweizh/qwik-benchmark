import type { RequestHandler } from "@builder.io/qwik-city";
import { mockRedisStore } from "~/lib/redisStore";

export const onRequest: RequestHandler = async (ev) => {
  const now = Date.now();
  const windowId = Math.floor(now / 10000);
  const resetTime = (windowId + 1) * 10;

  // Determine IP address
  let ip: string | undefined;
  const xForwardedFor = ev.request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const parts = xForwardedFor.split(",");
    if (parts.length > 0) {
      ip = parts[0].trim();
    }
  }
  if (!ip && ev.clientConn?.ip) {
    ip = ev.clientConn.ip;
  }
  if (!ip) {
    ip = "127.0.0.1";
  }

  const key = `ratelimit:${ip}:${windowId}`;
  const count = mockRedisStore.increment(key);

  const remaining = count > 5 ? 0 : 5 - count;

  // Set headers
  ev.headers.set("X-RateLimit-Limit", "5");
  ev.headers.set("X-RateLimit-Remaining", remaining.toString());
  ev.headers.set("X-RateLimit-Reset", resetTime.toString());

  if (count > 5) {
    ev.json(429, { error: "Too Many Requests" });
    return;
  }

  await ev.next();
};

export const onGet: RequestHandler = async (ev) => {
  ev.json(200, { data: "Success" });
};
