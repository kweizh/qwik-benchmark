import type { RequestHandler } from "@builder.io/qwik-city";
import { findActiveKeyByPlainKey } from "~/lib/api-keys";

export const onGet: RequestHandler = async (requestEvent) => {
  const apiKey = requestEvent.request.headers.get("x-api-key");

  if (!apiKey) {
    requestEvent.json(401, { error: "Unauthorized" });
    return;
  }

  const keyRecord = findActiveKeyByPlainKey(apiKey);

  if (!keyRecord) {
    requestEvent.json(401, { error: "Unauthorized" });
    return;
  }

  requestEvent.json(200, { message: "Hello, authenticated developer!" });
};
