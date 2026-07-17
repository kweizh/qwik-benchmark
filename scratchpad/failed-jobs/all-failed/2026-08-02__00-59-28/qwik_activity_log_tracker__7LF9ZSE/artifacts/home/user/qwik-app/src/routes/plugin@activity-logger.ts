import type { RequestHandler } from "@builder.io/qwik-city";
import { insertLog } from "~/db";

export const onRequest: RequestHandler = async (ev) => {
  const { pathname } = ev.url;

  const shouldLog = pathname.startsWith("/api/") || pathname.startsWith("/admin/");

  const startTime = performance.now();

  // Always call next() to let the request chain continue
  await ev.next();

  if (!shouldLog) {
    return;
  }

  const endTime = performance.now();
  const durationMs = Math.round(endTime - startTime);

  const ip = ev.clientConn.ip || ev.request.headers.get("x-forwarded-for") || "127.0.0.1";

  await insertLog({
    path: pathname,
    method: ev.method,
    ip,
    timestamp: new Date().toISOString(),
    duration_ms: durationMs,
  });
};
