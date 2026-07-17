import type { RequestHandler } from "@builder.io/qwik-city";
import { createApiKey, listApiKeys } from "~/lib/api-keys";

export const onGet: RequestHandler = async (requestEvent) => {
  const keys = listApiKeys().map((k) => ({
    id: k.id,
    name: k.name,
    prefix: k.key_prefix,
    status: k.status,
    created_at: k.created_at,
  }));
  requestEvent.json(200, keys);
};

export const onPost: RequestHandler = async (requestEvent) => {
  let body: unknown;
  try {
    body = await requestEvent.parseBody();
  } catch {
    body = undefined;
  }

  const name =
    body && typeof body === "object" && "name" in body
      ? String((body as Record<string, unknown>).name ?? "").trim()
      : "";

  if (!name) {
    requestEvent.json(400, { error: "Field 'name' is required" });
    return;
  }

  const { record, plainKey } = createApiKey(name);

  requestEvent.json(201, {
    id: record.id,
    name: record.name,
    prefix: record.key_prefix,
    key: plainKey,
    status: record.status,
    created_at: record.created_at,
  });
};
