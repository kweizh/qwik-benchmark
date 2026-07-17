import type { RequestHandler } from "@builder.io/qwik-city";

// Server-only in-memory counter. Lives in module scope so it persists
// across requests within a single server process (not shared across
// separate processes/workers).
let requestCounter = 0;

export const onGet: RequestHandler = async (requestEvent) => {
  requestCounter += 1;
  const n = requestCounter;

  requestEvent.json(200, {
    requestCount: n,
    cpu: (n * 7) % 100,
    memory: (n * 13) % 100,
    activeUsers: (n * 3) % 250,
    timestamp: Date.now(),
  });
};
