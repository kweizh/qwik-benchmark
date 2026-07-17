import { component$ } from "@builder.io/qwik";
import type { RequestHandler } from "@builder.io/qwik-city";
import { signJwt } from "../../lib/jwt";

// GET /login — render login page
export default component$(() => {
  return <div>Login Page</div>;
});

// POST /login — handle login form submission
export const onPost: RequestHandler = async ({ parseBody, cookie, redirect, json }) => {
  const body = await parseBody();

  if (!body || typeof body !== "object") {
    throw json(401, { error: "Invalid credentials" });
  }

  const { username, password } = body as Record<string, string>;

  if (username === "admin" && password === "password123") {
    const token = await signJwt({ username: "admin", role: "admin" });
    cookie.set("jwt_token", token, { path: "/", httpOnly: true });
    throw redirect(302, "/admin/dashboard");
  }

  throw json(401, { error: "Invalid credentials" });
};
