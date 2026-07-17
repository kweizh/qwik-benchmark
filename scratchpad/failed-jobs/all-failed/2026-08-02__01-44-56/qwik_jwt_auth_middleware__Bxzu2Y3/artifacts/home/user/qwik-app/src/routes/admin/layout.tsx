import { component$, Slot } from "@builder.io/qwik";
import type { RequestHandler } from "@builder.io/qwik-city";
import { verifyJwt } from "../../utils/jwt";

export const onRequest: RequestHandler = async ({ cookie, redirect }) => {
  const token = cookie.get("jwt_token")?.value;
  if (!token) {
    throw redirect(302, "/login");
  }

  const payload = verifyJwt(token, "secret_key_123");
  if (!payload || payload.role !== "admin") {
    throw redirect(302, "/login");
  }
};

export default component$(() => {
  return <Slot />;
});
