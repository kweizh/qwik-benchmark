import type { RequestHandler } from "@builder.io/qwik-city";

export const onGet: RequestHandler = async (ev) => {
  ev.json(200, { ping: "pong" });
};
