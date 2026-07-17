import crypto from "node:crypto";
import type { Cookie } from "@builder.io/qwik-city";
import { getDbSession, saveDbSession, deleteDbSession } from "./db.server";

export interface SessionData {
  email?: string;
  passwordHash?: string;
  fullName?: string;
  age?: number;
  country?: string;
}

const COOKIE_NAME = "registration_session";

export function getSession(cookie: Cookie): SessionData {
  const sessionId = cookie.get(COOKIE_NAME)?.value;
  if (!sessionId) {
    return {};
  }
  return getDbSession(sessionId) || {};
}

export function updateSession(cookie: Cookie, data: Partial<SessionData>): string {
  let sessionId = cookie.get(COOKIE_NAME)?.value;
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    cookie.set(COOKIE_NAME, sessionId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }
  const current = getDbSession(sessionId) || {};
  const updated = { ...current, ...data };
  saveDbSession(sessionId, updated);
  return sessionId;
}

export function clearSession(cookie: Cookie) {
  const sessionId = cookie.get(COOKIE_NAME)?.value;
  if (sessionId) {
    deleteDbSession(sessionId);
    cookie.delete(COOKIE_NAME, { path: "/" });
  }
}
