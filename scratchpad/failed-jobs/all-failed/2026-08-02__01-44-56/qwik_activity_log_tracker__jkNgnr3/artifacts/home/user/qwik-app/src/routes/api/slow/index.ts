import type { RequestHandler } from "@builder.io/qwik-city";

export const onGet: RequestHandler = async (event) => {
  const url = new URL(event.request.url);
  const delayParam = url.searchParams.get("delay");
  const delay = delayParam ? parseInt(delayParam, 10) : 0;

  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  event.json(200, { delayed: true, delay });
};
