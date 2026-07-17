import type { RequestHandler } from "@builder.io/qwik-city";
import { insertActivityLog } from "~/lib/db";

/**
 * Global Qwik City middleware plugin.
 *
 * Runs for every request (including `server$` calls) before any layout or
 * route handler. It logs requests whose pathname starts with `/api/` or
 * `/admin/` (including nested paths) to the local SQLite `ActivityLog`
 * table, capturing the exact elapsed time between receiving the request and
 * the route handler finishing (response ready).
 */
export const onRequest: RequestHandler = async (requestEvent) => {
  const { pathname } = requestEvent;
  const shouldLog = pathname.startsWith("/api/") || pathname.startsWith("/admin/");

  if (!shouldLog) {
    return;
  }

  const start = Date.now();
  const timestamp = new Date(start).toISOString();
  const method = requestEvent.method;
  const ip =
    requestEvent.clientConn?.ip ||
    requestEvent.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  try {
    // Runs the rest of the middleware chain (layouts, loaders, the route
    // handler, and rendering) and waits for it to fully complete before
    // resuming here, giving us the true end-to-end request duration.
    await requestEvent.next();
  } finally {
    const duration_ms = Date.now() - start;
    try {
      await insertActivityLog({
        path: pathname,
        method,
        ip,
        timestamp,
        duration_ms,
      });
    } catch (err) {
      console.error("[activity-log] failed to persist log entry", err);
    }
  }
};
