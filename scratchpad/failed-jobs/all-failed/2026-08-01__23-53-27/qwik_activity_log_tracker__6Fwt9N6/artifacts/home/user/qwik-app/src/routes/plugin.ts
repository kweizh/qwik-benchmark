import { type RequestHandler } from "@builder.io/qwik-city";
import { logActivity } from "../lib/db";

export const onRequest: RequestHandler = async ({ url, request, clientConn, next }) => {
  const pathname = url.pathname;
  const shouldLog = pathname.startsWith("/api/") || pathname.startsWith("/admin/");

  if (!shouldLog) {
    await next();
    return;
  }

  const start = Date.now();
  const timestamp = new Date().toISOString();
  const method = request.method;
  const ip = clientConn?.ip || "unknown";

  try {
    await next();
  } finally {
    const duration_ms = Date.now() - start;
    try {
      await logActivity({
        path: pathname,
        method,
        ip,
        timestamp,
        duration_ms,
      });
    } catch (e) {
      console.error("Failed to log activity:", e);
    }
  }
};
