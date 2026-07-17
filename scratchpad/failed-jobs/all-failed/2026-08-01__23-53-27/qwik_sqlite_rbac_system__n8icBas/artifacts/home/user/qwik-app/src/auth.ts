import type { RequestEventCommon } from '@builder.io/qwik-city';
import { getUserByEmail, type User } from './db';

export function getAuthenticatedUser(event: RequestEventCommon): User | null {
  const emailCookie = event.cookie.get('session_email');
  if (!emailCookie || !emailCookie.value) {
    return null;
  }
  return getUserByEmail(emailCookie.value);
}
