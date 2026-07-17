import type { RequestHandler } from "@builder.io/qwik-city";
import { writeWikiPage } from "~/lib/wiki-fs";
import { insertRevision } from "~/lib/wiki-db";

interface EditPayload {
  content?: unknown;
  user?: unknown;
}

export const onPost: RequestHandler = async (requestEvent) => {
  const { slug } = requestEvent.params;

  if (!slug) {
    requestEvent.json(400, { success: false, error: "Missing slug" });
    return;
  }

  const contentType = requestEvent.request.headers.get("content-type") ?? "";
  const isJsonRequest = contentType.includes("application/json");

  let payload: EditPayload | null = null;
  try {
    payload = (await requestEvent.parseBody()) as EditPayload | null;
  } catch {
    payload = null;
  }

  const content = typeof payload?.content === "string" ? payload.content : "";
  const user = typeof payload?.user === "string" ? payload.user : "";

  writeWikiPage(slug, content);
  insertRevision(slug, user, content.length);

  if (isJsonRequest) {
    requestEvent.json(200, { success: true });
    return;
  }

  throw requestEvent.redirect(303, `/wiki/${slug}`);
};
