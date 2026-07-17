import type { RequestHandler } from "@builder.io/qwik-city";
import { mockRedis } from "~/lib/mock-redis";

export const onGet: RequestHandler = async (requestEvent) => {
  throw requestEvent.json(200, { keys: mockRedis.getAll() });
};
