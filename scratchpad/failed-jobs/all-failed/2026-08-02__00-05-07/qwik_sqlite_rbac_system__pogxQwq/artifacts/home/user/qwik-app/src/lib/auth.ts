/**
 * Server-only auth helpers. Must only be called from within `routeLoader$`,
 * `routeAction$`, or `server$` functions.
 */
import type { Cookie } from "@builder.io/qwik-city";
import { getUserByEmail, type DbUser } from "./db";

export const SESSION_COOKIE = "session_email";

/**
 * Resolves the currently logged-in user (if any) from the `session_email`
 * cookie. Returns `null` when the cookie is missing, empty, or doesn't match
 * any user in the database.
 */
export function getSessionUser(cookie: Cookie): DbUser | null {
  const email = cookie.get(SESSION_COOKIE)?.value?.trim();
  if (!email) {
    return null;
  }
  const user = getUserByEmail(email);
  return user ?? null;
}
