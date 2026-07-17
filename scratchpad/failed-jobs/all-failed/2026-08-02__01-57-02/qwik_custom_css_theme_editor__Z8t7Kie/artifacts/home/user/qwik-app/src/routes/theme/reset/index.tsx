import { type RequestHandler } from "@builder.io/qwik-city";

export const onPost: RequestHandler = async (event) => {
  event.cookie.delete("user_theme", { path: "/" });
  throw event.redirect(302, "/theme");
};
