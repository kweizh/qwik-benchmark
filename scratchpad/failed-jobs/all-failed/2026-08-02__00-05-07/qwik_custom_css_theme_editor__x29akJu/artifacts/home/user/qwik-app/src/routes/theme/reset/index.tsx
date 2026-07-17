import type { RequestHandler } from "@builder.io/qwik-city";
import { THEME_COOKIE_NAME } from "~/lib/theme";

/**
 * Clears the `user_theme` cookie, restoring the default theme values,
 * then redirects back to the theme editor.
 */
export const onPost: RequestHandler = async (requestEvent) => {
  requestEvent.cookie.delete(THEME_COOKIE_NAME, { path: "/" });
  throw requestEvent.redirect(302, "/theme/");
};
