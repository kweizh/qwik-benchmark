import type { RequestHandler } from "@builder.io/qwik-city";

export const onGet: RequestHandler = async (requestEvent) => {
  requestEvent.json(200, { data: "Success" });
};
