import type { RequestHandler } from "@builder.io/qwik-city";

/**
 * In-memory counter persisted in module scope so it survives across requests
 * within a single server process. The first ever request returns a counter
 * value of 1 (it is incremented before computing the response).
 */
let counter = 0;

export const onGet: RequestHandler = ({ json }) => {
  // Increase the counter by exactly 1 on every GET request.
  counter += 1;
  const n = counter;

  // All metric values are derived deterministically from the counter so the
  // endpoint is reproducible given the same counter value (no Math.random).
  const requestCount = n;
  const cpu = (n * 7) % 100;
  const memory = (n * 13) % 100;
  const activeUsers = (n * 3) % 250;
  const timestamp = Date.now();

  json(200, {
    requestCount,
    cpu,
    memory,
    activeUsers,
    timestamp,
  });
};