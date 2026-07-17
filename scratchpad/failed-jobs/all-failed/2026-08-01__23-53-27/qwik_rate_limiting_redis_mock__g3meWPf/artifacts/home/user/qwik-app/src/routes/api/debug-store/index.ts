import type { RequestHandler } from "@builder.io/qwik-city";
import { mockRedisStore } from "~/lib/redisStore";

export const onGet: RequestHandler = async (ev) => {
  ev.json(200, {
    keys: mockRedisStore.getAllKeys(),
  });
};
