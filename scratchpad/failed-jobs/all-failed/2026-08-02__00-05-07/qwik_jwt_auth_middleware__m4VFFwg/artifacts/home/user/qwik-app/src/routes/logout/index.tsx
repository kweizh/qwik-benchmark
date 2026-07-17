import type { RequestHandler } from "@builder.io/qwik-city";

export const onPost: RequestHandler = (requestEvent) => {
  requestEvent.cookie.delete("jwt_token", { path: "/" });
  throw requestEvent.redirect(302, "/login");
};
