import type { RequestHandler } from "@builder.io/qwik-city";
import type { RateLimitResult } from "~/lib/rate-limiter";

/**
 * The `onRequest` middleware defined in `src/routes/api/layout.tsx` has
 * already enforced the rate limit (and set the `X-RateLimit-*` headers)
 * before this handler runs. Blocked requests never reach this file.
 */
function buildBody(method: "GET" | "POST", rateLimit: RateLimitResult | undefined) {
  return {
    method,
    message: `Hello from /api/data (${method})`,
    remaining: rateLimit?.remaining ?? 0,
    limit: rateLimit?.limit ?? 0,
  };
}

export const onGet: RequestHandler = async (requestEvent) => {
  const rateLimit = requestEvent.sharedMap.get("rateLimit") as RateLimitResult | undefined;
  requestEvent.json(200, buildBody("GET", rateLimit));
};

export const onPost: RequestHandler = async (requestEvent) => {
  const rateLimit = requestEvent.sharedMap.get("rateLimit") as RateLimitResult | undefined;
  requestEvent.json(200, buildBody("POST", rateLimit));
};
