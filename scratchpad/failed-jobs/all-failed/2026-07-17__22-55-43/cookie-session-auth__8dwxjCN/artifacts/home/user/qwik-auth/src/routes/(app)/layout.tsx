import { component$, Slot } from "@builder.io/qwik";
import {
  routeLoader$,
  type RequestHandler,
} from "@builder.io/qwik-city";
import { getUserBySession } from "~/auth/db.server";

export const onRequest: RequestHandler = async (requestEvent) => {
  const sessionId = requestEvent.cookie.get("session")?.value;
  const user = getUserBySession(sessionId);

  if (!user) {
    throw requestEvent.redirect(302, "/login");
  }
};

export const useAuthenticatedUser = routeLoader$((requestEvent) => {
  const sessionId = requestEvent.cookie.get("session")?.value;
  const user = getUserBySession(sessionId);

  // onRequest above guarantees this is non-null, but guard again for safety.
  if (!user) {
    throw requestEvent.redirect(302, "/login");
  }

  return user;
});

export default component$(() => {
  return <Slot />;
});
