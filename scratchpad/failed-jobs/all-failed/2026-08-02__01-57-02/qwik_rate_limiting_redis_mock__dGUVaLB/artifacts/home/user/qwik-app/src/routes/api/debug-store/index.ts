import type { RequestHandler } from "@builder.io/qwik-city";
import { redisStore } from "../../../lib/store";

export const onGet: RequestHandler = async (event) => {
  event.json(200, { keys: redisStore.getKeys() });
};
