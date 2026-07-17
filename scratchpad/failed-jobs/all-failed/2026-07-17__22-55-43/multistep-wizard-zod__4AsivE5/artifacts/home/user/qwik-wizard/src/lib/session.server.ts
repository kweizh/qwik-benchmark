import { randomUUID } from "node:crypto";
import type { RequestEventBase } from "@builder.io/qwik-city";

const SESSION_COOKIE = "wizard_session";

/**
 * Reads the wizard session id from the request cookie, creating (and
 * setting) a brand new one if it doesn't exist yet. The cookie only ever
 * contains an opaque, random identifier -- all actual form data lives
 * server-side, keyed by this id.
 */
export function getSessionId(requestEvent: RequestEventBase): string {
  const existing = requestEvent.cookie.get(SESSION_COOKIE)?.value;
  if (existing) {
    return existing;
  }

  const sessionId = randomUUID();
  requestEvent.cookie.set(SESSION_COOKIE, sessionId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: [1, "days"],
  });
  return sessionId;
}
