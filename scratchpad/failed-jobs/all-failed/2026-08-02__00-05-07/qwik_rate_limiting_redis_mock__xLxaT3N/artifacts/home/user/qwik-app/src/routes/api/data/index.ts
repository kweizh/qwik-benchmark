import type { RequestHandler } from "@builder.io/qwik-city";
import { checkRateLimit, getClientIp } from "~/lib/rate-limiter";

export const onGet: RequestHandler = async (requestEvent) => {
  const ip = getClientIp(requestEvent.request, requestEvent.clientConn.ip);
  const result = checkRateLimit(ip);

  requestEvent.headers.set("X-RateLimit-Limit", String(result.limit));
  requestEvent.headers.set("X-RateLimit-Remaining", String(result.remaining));
  requestEvent.headers.set("X-RateLimit-Reset", String(result.reset));

  if (!result.allowed) {
    throw requestEvent.json(429, { error: "Too Many Requests" });
  }

  throw requestEvent.json(200, { data: "Success" });
};
