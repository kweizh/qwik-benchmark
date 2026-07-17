import type { RequestHandler } from "@builder.io/qwik-city";

export const onPost: RequestHandler = async (ev) => {
  ev.cookie.delete("user_theme", { path: "/" });
  throw ev.redirect(302, "/theme");
};
