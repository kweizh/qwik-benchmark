import { component$ } from "@builder.io/qwik";
import type { RequestHandler } from "@builder.io/qwik-city";

export const onPost: RequestHandler = async ({ cookie, redirect }) => {
  cookie.delete("jwt_token", { path: "/" });
  throw redirect(302, "/login");
};

export default component$(() => {
  return null;
});
