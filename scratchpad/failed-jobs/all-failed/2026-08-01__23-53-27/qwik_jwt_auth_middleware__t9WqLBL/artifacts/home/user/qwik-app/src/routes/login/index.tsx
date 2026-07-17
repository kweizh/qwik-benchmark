import { component$ } from "@builder.io/qwik";
import type { RequestHandler } from "@builder.io/qwik-city";
import { signJwt } from "../../utils/jwt";

export const onPost: RequestHandler = async (event) => {
  const body = (await event.parseBody()) as any;
  const username = body?.username;
  const password = body?.password;

  if (username === "admin" && password === "password123") {
    const payload = {
      username: "admin",
      role: "admin",
    };
    const token = signJwt(payload, "secret_key_123");
    
    event.cookie.set("jwt_token", token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
    
    throw event.redirect(302, "/admin/dashboard");
  } else {
    event.json(401, { error: "Invalid credentials" });
  }
};

export default component$(() => {
  return (
    <div>
      Login Page
    </div>
  );
});
