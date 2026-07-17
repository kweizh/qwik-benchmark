import type { RequestHandler } from "@builder.io/qwik-city";

export const onGet: RequestHandler = async (event) => {
  event.json(200, { ping: "pong" });
};
