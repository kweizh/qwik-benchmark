// src/routes/api/layout.tsx
import type { RequestHandler } from "@builder.io/qwik-city";
import { getClientIp, checkLimit } from "../../lib/limiter";

export const onRequest: RequestHandler = async (event) => {
  const ip = getClientIp(event);
  const result = checkLimit(ip, true);

  // Set response headers
  event.headers.set("X-RateLimit-Limit", String(result.limit));
  event.headers.set("X-RateLimit-Remaining", String(result.remaining));
  event.headers.set("X-RateLimit-Reset", String(result.reset));

  // Store remaining in sharedMap for easy access in endpoints
  event.sharedMap.set("rateLimitRemaining", result.remaining);

  if (!result.allowed) {
    if (result.retryAfter !== undefined) {
      event.headers.set("Retry-After", String(result.retryAfter));
    }
    // Respond with 429 and JSON body, and stop the chain
    event.json(429, { error: "Rate limit exceeded" });
    return;
  }

  await event.next();
};
