import { type RequestHandler } from "@builder.io/qwik-city";
import { logActivity } from "../db";

export const onRequest: RequestHandler = async ({ url, method, clientConn, next }) => {
  const path = url.pathname;
  const matches = path.startsWith("/api/") || path.startsWith("/admin/");

  if (!matches) {
    await next();
    return;
  }

  const startTime = performance.now();
  const timestamp = new Date().toISOString();

  try {
    await next();
  } finally {
    const duration_ms = Math.round(performance.now() - startTime);
    const ip = clientConn.ip || "127.0.0.1";
    try {
      await logActivity(path, method, ip, timestamp, duration_ms);
    } catch (err) {
      console.error("Failed to log activity:", err);
    }
  }
};
