import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { peek, getClientIp } from "~/lib/rate-limiter";

/**
 * Read-only lookup of the current rate-limit quota for the requesting
 * client IP. This uses `peek()`, which never increments the counters, so
 * viewing this page does not consume any of the client's quota.
 */
export const useRateLimitStatus = routeLoader$((requestEvent) => {
  const ip = getClientIp(requestEvent.request, requestEvent.clientConn.ip);
  const result = peek(ip);
  return { ip, ...result };
});

export default component$(() => {
  const status = useRateLimitStatus();

  return (
    <>
      <h1>Rate Limit Status</h1>
      <p>{`Limit: ${status.value.limit}`}</p>
      <p>{`Remaining: ${status.value.remaining}`}</p>
      <p>{`Reset: ${status.value.resetSeconds}s`}</p>
    </>
  );
});
