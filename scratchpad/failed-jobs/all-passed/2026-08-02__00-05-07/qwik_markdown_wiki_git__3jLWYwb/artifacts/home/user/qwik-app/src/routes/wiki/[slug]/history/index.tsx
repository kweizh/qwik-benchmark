import type { RequestHandler } from "@builder.io/qwik-city";
import { getRevisions } from "~/lib/wiki-db";

export const onGet: RequestHandler = async (requestEvent) => {
  const { slug } = requestEvent.params;

  if (!slug) {
    requestEvent.json(400, { success: false, error: "Missing slug" });
    return;
  }

  const revisions = getRevisions(slug);

  requestEvent.json(200, revisions);
};
