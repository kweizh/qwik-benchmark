/**
 * Public demo page at `/status` that surfaces the current per-IP quota
 * without consuming any of it.
 *
 * PEEK ONLY: a `routeLoader$` reads the limiter state via `peek()`; nothing
 * here ever increments the counter, so a curious user can refresh as many
 * times as they want without burning quota.
 */

import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getClientIp, peek, RATE_LIMIT } from "~/lib/rate-limit";

export const useQuota = routeLoader$((ev) => {
  const ip = getClientIp(ev);
  return peek(ip);
});

export default component$(() => {
  const quota = useQuota();
  return (
    <>
      <h1>Rate Limit Status</h1>
      <p>
        Your current quota as observed by the in-memory limiter.
      </p>
      <pre id="quota">Limit: {RATE_LIMIT}
Remaining: {quota.value.remaining}
Reset in (s): {quota.value.resetIn}</pre>
    </>
  );
});

export const head: DocumentHead = {
  title: "Rate Limit Status",
  meta: [
    {
      name: "description",
      content: "Shows the current per-IP rate limit quota.",
    },
  ],
};
