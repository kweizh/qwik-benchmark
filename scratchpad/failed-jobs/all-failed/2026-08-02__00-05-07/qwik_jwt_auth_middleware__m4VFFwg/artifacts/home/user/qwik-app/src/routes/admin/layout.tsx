import { component$, Slot } from "@builder.io/qwik";
import type { RequestHandler } from "@builder.io/qwik-city";
import { verifyJwt } from "~/lib/jwt";

/**
 * Authentication middleware for all routes under `/admin/*`.
 *
 * - Checks for the presence of the `jwt_token` cookie.
 * - Verifies the HMAC-SHA256 signature of the token.
 * - Ensures the decoded payload has a `role` of `"admin"`.
 * - Redirects to `/login` with a 302 status if any of the above checks fail.
 */
export const onRequest: RequestHandler = (requestEvent) => {
  const token = requestEvent.cookie.get("jwt_token")?.value;
  const payload = verifyJwt(token);

  if (!payload || payload.role !== "admin") {
    throw requestEvent.redirect(302, "/login");
  }

  // Make the authenticated payload available to child routes.
  requestEvent.sharedMap.set("authUser", payload);
};

export default component$(() => {
  return <Slot />;
});
