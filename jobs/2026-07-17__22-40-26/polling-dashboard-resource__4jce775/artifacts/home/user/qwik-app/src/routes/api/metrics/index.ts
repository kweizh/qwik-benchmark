import type { RequestHandler } from "@builder.io/qwik-city";

/**
 * In-memory counter that persists across requests within a single
 * server process. The first request returns a value of 1.
 */
let counter = 0;

export const onGet: RequestHandler = ({ json }) => {
  counter += 1;
  const n = counter;

  const metrics = {
    requestCount: n,
    cpu: (n * 7) % 100,
    memory: (n * 13) % 100,
    activeUsers: (n * 3) % 250,
    timestamp: Date.now(),
  };

  json(200, metrics);
};