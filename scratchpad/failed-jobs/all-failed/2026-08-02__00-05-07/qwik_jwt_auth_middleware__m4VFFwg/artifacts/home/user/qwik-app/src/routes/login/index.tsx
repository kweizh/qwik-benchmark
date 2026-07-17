import { component$ } from "@builder.io/qwik";
import type { DocumentHead, RequestHandler } from "@builder.io/qwik-city";
import { createJwt } from "~/lib/jwt";

const VALID_USERNAME = "admin";
const VALID_PASSWORD = "password123";

interface Credentials {
  username?: unknown;
  password?: unknown;
}

export const onPost: RequestHandler = async (requestEvent) => {
  // `parseBody()` natively handles `application/json`,
  // `application/x-www-form-urlencoded`, and `multipart/form-data` requests.
  const credentials = (await requestEvent.parseBody()) as Credentials;

  const username = typeof credentials.username === "string" ? credentials.username : "";
  const password = typeof credentials.password === "string" ? credentials.password : "";

  if (username === VALID_USERNAME && password === VALID_PASSWORD) {
    const token = createJwt({ username: VALID_USERNAME, role: "admin" });

    requestEvent.cookie.set("jwt_token", token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });

    throw requestEvent.redirect(302, "/admin/dashboard");
  }

  requestEvent.json(401, { error: "Invalid credentials" });
};

export default component$(() => {
  return (
    <div>
      <h1>Login Page</h1>
      <form method="post">
        <label>
          Username
          <input type="text" name="username" />
        </label>
        <label>
          Password
          <input type="password" name="password" />
        </label>
        <button type="submit">Login</button>
      </form>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Login",
};
