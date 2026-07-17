import type { RequestHandler } from "@builder.io/qwik-city";

let counter = 0;

export const onGet: RequestHandler = async ({ json }) => {
  counter++;
  const cpu = (counter * 7) % 100;
  const memory = (counter * 13) % 100;
  const activeUsers = (counter * 3) % 250;
  const timestamp = Date.now();

  json(200, {
    requestCount: counter,
    cpu,
    memory,
    activeUsers,
    timestamp,
  });
};
