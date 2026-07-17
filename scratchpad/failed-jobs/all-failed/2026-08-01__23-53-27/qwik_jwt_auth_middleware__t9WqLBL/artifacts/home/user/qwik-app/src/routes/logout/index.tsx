import type { RequestHandler } from "@builder.io/qwik-city";

export const onPost: RequestHandler = async (event) => {
  event.cookie.delete("jwt_token", { path: "/" });
  throw event.redirect(302, "/login");
};
