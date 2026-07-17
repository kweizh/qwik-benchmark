import type { RequestHandler } from "@builder.io/qwik-city";
import { mockRedisStore } from "../../../lib/store";

export const onGet: RequestHandler = async (event) => {
  event.json(200, mockRedisStore.getState());
};
