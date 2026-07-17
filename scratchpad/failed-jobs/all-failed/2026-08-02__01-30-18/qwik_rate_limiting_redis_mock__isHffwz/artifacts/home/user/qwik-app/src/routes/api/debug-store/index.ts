import type { RequestHandler } from "@builder.io/qwik-city";
import { getStoreState, cleanExpiredKeys } from "../../store";

export const onGet: RequestHandler = async (requestEvent) => {
  const currentWindowId = Math.floor(Date.now() / 10000);
  cleanExpiredKeys(currentWindowId);
  requestEvent.json(200, getStoreState());
};
