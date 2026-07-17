import { component$ } from "@builder.io/qwik";
import type { RequestHandler } from "@builder.io/qwik-city";
import { signJwt } from "../../utils/jwt";

export const onPost: RequestHandler = async ({ parseBody, cookie, redirect, json }) => {
  const body = (await parseBody()) as any;
  const username = body?.username;
  const password = body?.password;

  if (username === "admin" && password === "password123") {
    const token = signJwt({ username: "admin", role: "admin" }, "secret_key_123");
    cookie.set("jwt_token", token, { path: "/" });
    throw redirect(302, "/admin/dashboard");
  } else {
    json(401, { error: "Invalid credentials" });
  }
};

export default component$(() => {
  return (
    <div>
      Login Page
    </div>
  );
});
