import { type RequestHandler } from "@builder.io/qwik-city";
import { getSessionUsername } from "~/lib/auth.server";

export const onGet: RequestHandler = (ev) => {
  const token = ev.cookie.get("session")?.value;
  const username = getSessionUsername(token);
  if (username) {
    throw ev.redirect(302, "/dashboard");
  }
  throw ev.redirect(302, "/login");
};