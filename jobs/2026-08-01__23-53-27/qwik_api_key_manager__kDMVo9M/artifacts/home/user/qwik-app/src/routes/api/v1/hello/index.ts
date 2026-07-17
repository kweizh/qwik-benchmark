import type { RequestHandler } from "@builder.io/qwik-city";
import db, { hashKey } from "~/lib/db";

export const onGet: RequestHandler = async (requestEvent) => {
  try {
    const apiKey = requestEvent.request.headers.get("X-API-Key");

    if (!apiKey) {
      requestEvent.status(401);
      return requestEvent.json(401, { error: "Unauthorized" });
    }

    const hashed = hashKey(apiKey);

    const stmt = db.prepare("SELECT status FROM api_keys WHERE hashed_key = ?");
    const record = stmt.get(hashed) as { status: string } | undefined;

    if (!record || record.status !== "active") {
      requestEvent.status(401);
      return requestEvent.json(401, { error: "Unauthorized" });
    }

    return requestEvent.json(200, {
      message: "Hello, authenticated developer!",
    });
  } catch (err: any) {
    requestEvent.status(500);
    return requestEvent.json(500, { error: err.message || "Internal Server Error" });
  }
};
