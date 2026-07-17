import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getClientIp, peek } from "../../lib/rate-limiter";

/**
 * Demo page (HTML component route, NOT under /api/) that reports the current
 * remaining quota for the requesting client.
 *
 * It uses a server `routeLoader$` that only *peeks* at the limiter state, so
 * viewing this page never consumes any quota.
 */
export const useStatus = routeLoader$((ev) => {
  const ip = getClientIp(ev);
  const result = peek(ip);
  return {
    ip,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
});

export default component$(() => {
  const status = useStatus();
  return (
    <>
      <h1>Rate Limit Status</h1>
      {/* Label + value are emitted as a single expression so the literal text
          "Limit: 5" / "Remaining: <n>" stays contiguous in the rendered HTML. */}
      <p>{`Limit: ${status.value.limit}`}</p>
      <p>{`Remaining: ${status.value.remaining}`}</p>
      <p>{`Reset: ${status.value.reset}s`}</p>
      <p>{`Client IP: ${status.value.ip}`}</p>
      <p>This page only reads your quota; it does not consume any.</p>
    </>
  );
});

export const head: DocumentHead = {
  title: "Rate Limit Status",
  meta: [
    {
      name: "description",
      content: "Current rate-limit quota for the requesting client.",
    },
  ],
};