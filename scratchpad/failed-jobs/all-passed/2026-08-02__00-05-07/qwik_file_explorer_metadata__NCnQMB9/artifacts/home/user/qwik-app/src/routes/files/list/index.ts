import type { RequestHandler } from "@builder.io/qwik-city";
import { listFiles } from "~/lib/db";

export const onGet: RequestHandler = async (requestEvent) => {
  const files = listFiles();
  requestEvent.json(200, files);
};
