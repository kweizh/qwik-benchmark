import type { Cookie, RequestEvent } from "@builder.io/qwik-city";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Server-side state persisted between wizard steps.
 *
 * We keep this small and JSON-serialisable. The session id itself is stored in a
 * cookie; the data is stored in-process keyed by that id.
 */
export interface WizardData {
  account?: {
    email: string;
    passwordHash: string;
  };
  profile?: {
    fullName: string;
    age: number;
    country: string;
  };
}

const COOKIE_NAME = "wizard_sid";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24; // 1 day

/**
 * In-memory session store. For a production system you would back this with Redis
 * or a database; for this assignment an in-process Map is sufficient and keeps the
 * app stateless across restarts aside from the cookie jar that is discarded.
 */
const store = new Map<string, WizardData>();

function generateId(): string {
  return randomBytes(24).toString("hex");
}

export function readSession(ev: Pick<RequestEvent, "cookie">): WizardData {
  const sid = ev.cookie.get(COOKIE_NAME)?.value;
  if (!sid) return {};
  const data = store.get(sid);
  return data ?? {};
}

export function getSessionId(ev: Pick<RequestEvent, "cookie">): string {
  let sid = ev.cookie.get(COOKIE_NAME)?.value;
  if (!sid || !store.has(sid)) {
    sid = generateId();
    store.set(sid, {});
  }
  ev.cookie.set(COOKIE_NAME, sid, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return sid;
}

export function writeSession(
  ev: Pick<RequestEvent, "cookie">,
  patch: WizardData,
): void {
  const sid = getSessionId(ev);
  const current = store.get(sid) ?? {};
  store.set(sid, { ...current, ...patch });
}

export function clearSession(ev: Pick<RequestEvent, "cookie">): void {
  const sid = ev.cookie.get(COOKIE_NAME)?.value;
  if (sid) store.delete(sid);
  ev.cookie.delete(COOKIE_NAME, { path: "/" });
}

export function cookieName(): string {
  return COOKIE_NAME;
}

/**
 * One-way password hashing using scrypt with a per-password random salt.
 *
 * The resulting string is laid out as `<salt-hex>$<hash-hex>` so it is easy to
 * persist alongside the rest of the user record.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split("$");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}