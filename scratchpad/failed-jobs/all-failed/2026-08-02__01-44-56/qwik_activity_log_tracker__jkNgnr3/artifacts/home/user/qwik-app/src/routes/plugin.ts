import type { RequestHandler } from "@builder.io/qwik-city";
import { runQuery } from "../db";

export const onRequest: RequestHandler = async (event) => {
  const url = new URL(event.request.url);
  const path = url.pathname;

  const isLoggedPath = path.startsWith("/api/") || path.startsWith("/admin/");

  if (!isLoggedPath) {
    await event.next();
    return;
  }

  const start = Date.now();
  const timestamp = new Date().toISOString();
  const method = event.request.method;
  const ip =
    event.clientConn.ip ||
    event.request.headers.get("x-forwarded-for") ||
    "127.0.0.1";

  try {
    await event.next();
  } finally {
    const duration_ms = Date.now() - start;
    try {
      await runQuery(
        "INSERT INTO ActivityLog (path, method, ip, timestamp, duration_ms) VALUES (?, ?, ?, ?, ?)",
        [path, method, ip, timestamp, duration_ms],
      );
    } catch (err) {
      console.error("Database logging error:", err);
    }
  }
};
