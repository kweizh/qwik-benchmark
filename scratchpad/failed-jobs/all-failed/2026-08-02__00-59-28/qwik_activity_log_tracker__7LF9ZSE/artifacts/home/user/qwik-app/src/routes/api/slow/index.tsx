import type { RequestHandler } from "@builder.io/qwik-city";

export const onGet: RequestHandler = async (ev) => {
  const delayParam = ev.query.get("delay");
  const delay = delayParam ? parseInt(delayParam, 10) : 0;

  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  ev.json(200, { delayed: true, delay });
};
