import { type RequestHandler } from "@builder.io/qwik-city";

export const onGet: RequestHandler = async ({ url, json }) => {
  const delayParam = url.searchParams.get("delay");
  const delay = delayParam ? parseInt(delayParam, 10) : 0;

  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  json(200, { delayed: true, delay });
};
