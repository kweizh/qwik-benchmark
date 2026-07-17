import { component$, Slot } from "@builder.io/qwik";
import type { RequestHandler } from "@builder.io/qwik-city";
import { verifyJwt } from "../../lib/jwt";

export const onRequest: RequestHandler = async ({ cookie, redirect, next, sharedMap }) => {
  const token = cookie.get("jwt_token");
  if (!token) {
    throw redirect(302, "/login");
  }

  const payload = await verifyJwt(token.value);
  if (!payload || payload.role !== "admin") {
    throw redirect(302, "/login");
  }

  sharedMap.set("user", payload);
  await next();
};

export default component$(() => {
  return <Slot />;
});
