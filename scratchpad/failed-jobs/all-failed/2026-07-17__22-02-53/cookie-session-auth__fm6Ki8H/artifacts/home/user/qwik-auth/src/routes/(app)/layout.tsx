import { component$, Slot } from "@builder.io/qwik";
import { type RequestHandler, routeLoader$ } from "@builder.io/qwik-city";
import { getSession } from "../../auth.server";

export const onRequest: RequestHandler = async (event) => {
  const sessionCookie = event.cookie.get("session")?.value;
  if (!sessionCookie) {
    throw event.redirect(302, "/login");
  }
  const session = getSession(sessionCookie);
  if (!session) {
    event.cookie.delete("session", { path: "/" });
    throw event.redirect(302, "/login");
  }
  event.sharedMap.set("user", session);
};

export const useUserLoader = routeLoader$((event) => {
  return event.sharedMap.get("user") as { username: string };
});

export default component$(() => {
  return <Slot />;
});
