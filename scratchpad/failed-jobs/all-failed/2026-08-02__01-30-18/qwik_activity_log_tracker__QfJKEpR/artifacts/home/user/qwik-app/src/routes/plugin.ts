import type { RequestHandler } from '@builder.io/qwik-city';
import { insertActivityLog } from '../lib/db';

export const onRequest: RequestHandler = async (event) => {
  const { url, method, clientConn, request, next } = event;
  const pathname = url.pathname;

  const shouldLog = pathname.startsWith('/api/') || pathname.startsWith('/admin/');

  if (!shouldLog) {
    await next();
    return;
  }

  let ip = clientConn.ip || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }

  const timestamp = new Date().toISOString();
  const startTime = performance.now();

  try {
    await next();
  } finally {
    const endTime = performance.now();
    const duration_ms = Math.round(endTime - startTime);

    try {
      await insertActivityLog({
        path: pathname,
        method,
        ip,
        timestamp,
        duration_ms,
      });
    } catch (dbErr) {
      console.error('Failed to log activity to database:', dbErr);
    }
  }
};
