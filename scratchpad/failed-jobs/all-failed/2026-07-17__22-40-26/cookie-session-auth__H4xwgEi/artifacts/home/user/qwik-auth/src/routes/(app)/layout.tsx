import { component$, Slot } from "@builder.io/qwik";
import {
  routeLoader$,
  type RequestHandler,
} from "@builder.io/qwik-city";
import { getSessionUsername } from "~/lib/auth.server";

/**
 * Shared layout middleware for all routes inside the `(app)` route group.
 *
 * Every request to a protected page must carry a valid `session` cookie
 * pointing at a row in the `sessions` SQLite table. If no valid session is
 * found the request is redirected to `/login` immediately.
 */
export const onRequest: RequestHandler = (ev) => {
  const token = ev.cookie.get("session")?.value;
  const username = getSessionUsername(token);
  if (!username) {
    throw ev.redirect(302, "/login");
  }
  // Make the username available to loaders/components via sharedMap.
  ev.sharedMap.set("user", { username });
};

export const useCurrentUser = routeLoader$((ev) => {
  const token = ev.cookie.get("session")?.value;
  const username = getSessionUsername(token);
  if (!username) {
    throw ev.redirect(302, "/login");
  }
  return { username };
});

export default component$(() => {
  return <Slot />;
});