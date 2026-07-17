/**
 * JSON endpoint at `GET /api/data` and `POST /api/data`.
 *
 * Rate limiting lives in the shared `onRequest` middleware exported from
 * `src/routes/api/layout.tsx`, so by the time these handlers run we already
 * know the request was permitted and how many tokens the caller has left.
 *
 * The `X-RateLimit-*` response headers are also set by the middleware; we
 * only need to build the JSON body here.
 */

import type { RequestHandler } from "@builder.io/qwik-city";
import { RATE_LIMIT_REMAINING_KEY } from "~/routes/api/layout";

const handle: RequestHandler = (ev) => {
  const remaining =
    (ev.sharedMap.get(RATE_LIMIT_REMAINING_KEY) as number | undefined) ?? 0;

  ev.json(200, {
    method: ev.method,
    remaining,
  });
};

export const onGet: RequestHandler = handle;
export const onPost: RequestHandler = handle;
