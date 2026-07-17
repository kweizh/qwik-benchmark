/**
 * Server-only session helpers.
 *
 * Only a *type* is imported from `@builder.io/qwik-city` (erased at compile
 * time) and `node:crypto` is loaded via dynamic `import()`, so this module is
 * safe to reference from `server$()` / `routeLoader$()` bodies without leaking
 * into the client bundle.
 */
import type { RequestEventBase } from "@builder.io/qwik-city";

export const SESSION_COOKIE = "session_id";

/**
 * Returns the visitor's session id, creating and cookie-setting it on the
 * first write when the cookie is absent.
 */
export async function ensureSession(
  event: RequestEventBase,
): Promise<string> {
  const existing = event.cookie.get(SESSION_COOKIE);
  if (existing) {
    return existing.value;
  }
  const { randomUUID } = await import("node:crypto");
  const sessionId = randomUUID();
  event.cookie.set(SESSION_COOKIE, sessionId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return sessionId;
}