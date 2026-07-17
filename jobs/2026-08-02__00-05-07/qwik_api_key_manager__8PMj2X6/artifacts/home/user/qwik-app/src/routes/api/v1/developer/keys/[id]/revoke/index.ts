import type { RequestHandler } from "@builder.io/qwik-city";
import { revokeApiKey } from "~/lib/api-keys";

export const onPost: RequestHandler = async (requestEvent) => {
  const idParam = requestEvent.params.id;
  const id = Number(idParam);

  if (!Number.isInteger(id) || id <= 0) {
    requestEvent.json(404, { error: "Key not found" });
    return;
  }

  const revoked = revokeApiKey(id);

  if (!revoked) {
    requestEvent.json(404, { error: "Key not found" });
    return;
  }

  requestEvent.json(200, {
    success: true,
    message: `Key ${id} has been revoked`,
  });
};
