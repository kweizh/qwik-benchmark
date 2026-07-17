import type { RequestEventCommon } from "@builder.io/qwik-city";
import { getUserByEmail, type User } from "./db";

export function getSessionUser(
  requestEvent: RequestEventCommon,
): User | undefined {
  const cookieHeader = requestEvent.request.headers.get("cookie") || "";
  const match = cookieHeader.match(/session_email=([^;]+)/);
  if (!match || !match[1]) {
    return undefined;
  }
  const email = decodeURIComponent(match[1]);
  return getUserByEmail(email);
}
