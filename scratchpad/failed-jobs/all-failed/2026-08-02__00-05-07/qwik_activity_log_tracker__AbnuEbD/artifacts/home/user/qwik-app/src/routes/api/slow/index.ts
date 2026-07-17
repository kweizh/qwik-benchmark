import type { RequestHandler } from "@builder.io/qwik-city";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const onGet: RequestHandler = async (requestEvent) => {
  const delayParam = requestEvent.query.get("delay");
  const delay = Math.max(0, Number.parseInt(delayParam ?? "0", 10) || 0);

  await wait(delay);

  requestEvent.json(200, { delayed: true, delay });
};
