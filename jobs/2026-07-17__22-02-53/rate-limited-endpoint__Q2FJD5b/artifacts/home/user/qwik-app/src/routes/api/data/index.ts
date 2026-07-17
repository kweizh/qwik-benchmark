// src/routes/api/data/index.ts
import type { RequestHandler } from "@builder.io/qwik-city";

export const onGet: RequestHandler = async (event) => {
  const remaining = event.sharedMap.get("rateLimitRemaining");
  event.json(200, {
    method: "GET",
    remaining: remaining !== undefined ? remaining : 5,
  });
};

export const onPost: RequestHandler = async (event) => {
  const remaining = event.sharedMap.get("rateLimitRemaining");
  event.json(200, {
    method: "POST",
    remaining: remaining !== undefined ? remaining : 5,
  });
};
