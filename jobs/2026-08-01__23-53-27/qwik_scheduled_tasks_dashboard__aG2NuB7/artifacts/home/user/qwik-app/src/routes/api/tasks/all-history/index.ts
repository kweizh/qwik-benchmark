import type { RequestHandler } from "@builder.io/qwik-city";
import { db } from "~/lib/db";

export const onGet: RequestHandler = async ({ json }) => {
  try {
    const history = db
      .prepare("SELECT * FROM execution_history ORDER BY timestamp DESC LIMIT 50")
      .all();
    json(200, history);
  } catch (err: any) {
    json(500, { error: err.message });
  }
};
