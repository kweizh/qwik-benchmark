import { component$ } from "@builder.io/qwik";
import type { RequestHandler } from "@builder.io/qwik-city";
import { signJwt } from "../../utils/jwt";

export const onPost: RequestHandler = async ({
  parseBody,
  request,
  cookie,
  redirect,
  json,
}) => {
  let body: any = null;
  try {
    body = await parseBody();
  } catch {
    // ignore
  }

  if (!body) {
    try {
      body = await request.json();
    } catch {
      // ignore
    }
  }

  if (!body) {
    try {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
    } catch {
      // ignore
    }
  }

  const username = body?.username;
  const password = body?.password;

  if (username === "admin" && password === "password123") {
    const token = signJwt(
      {
        username: "admin",
        role: "admin",
      },
      "secret_key_123"
    );

    cookie.set("jwt_token", token, { path: "/", httpOnly: true });
    throw redirect(302, "/admin/dashboard");
  }

  json(401, { error: "Invalid credentials" });
};

export default component$(() => {
  return <div>Login Page</div>;
});
