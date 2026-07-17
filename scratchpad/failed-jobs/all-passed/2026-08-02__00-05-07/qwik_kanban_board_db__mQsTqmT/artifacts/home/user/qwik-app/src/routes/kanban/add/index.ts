import type { RequestHandler } from "@builder.io/qwik-city";
import { addTask } from "~/lib/db";

function extractTitle(body: unknown): string | undefined {
  if (body == null) return undefined;

  if (typeof body === "object") {
    // FormData-like or plain object (from JSON / urlencoded / multipart parsing)
    if (typeof (body as any).get === "function") {
      const value = (body as any).get("title");
      return typeof value === "string" ? value : undefined;
    }
    const value = (body as Record<string, unknown>).title;
    return typeof value === "string" ? value : undefined;
  }

  return undefined;
}

export const onPost: RequestHandler = async (requestEvent) => {
  const body = await requestEvent.parseBody();
  const title = extractTitle(body)?.trim();

  if (!title) {
    requestEvent.json(400, { error: "title is required" });
    return;
  }

  const task = addTask(title);
  requestEvent.json(201, task);
};
