import { component$, Slot } from "@builder.io/qwik";
import { type RequestHandler } from "@builder.io/qwik-city";
import { getSessionUser } from "~/db.server";

/**
 * Layout middleware guarding every route inside the `(app)` route group.
 *
 * A request without a valid `session` cookie is redirected to `/login`.
 * This keeps `/login` itself public (it lives outside this group) while
 * protecting `/dashboard` and any other routes added under `(app)`.
 */
export const onRequest: RequestHandler = async (event) => {
  const token = event.cookie.get("session")?.value;
  if (!token) {
    throw event.redirect(302, "/login");
  }

  const username = getSessionUser(token);
  if (!username) {
    // The cookie is present but no matching session exists — clear it and
    // bounce back to the login page.
    event.cookie.delete("session", { path: "/" });
    throw event.redirect(302, "/login");
  }
};

export default component$(() => {
  return <Slot />;
});