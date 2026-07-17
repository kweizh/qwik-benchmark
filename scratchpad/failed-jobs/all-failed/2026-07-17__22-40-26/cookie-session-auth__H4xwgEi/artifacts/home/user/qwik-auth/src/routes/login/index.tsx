import { component$ } from "@builder.io/qwik";
import {
  Form,
  routeAction$,
  z,
  zod$,
  type DocumentHead,
} from "@builder.io/qwik-city";
import {
  createSession,
  getUserByUsername,
  verifyPassword,
} from "~/lib/auth.server";

export const useLoginAction = routeAction$(
  async (data, ev) => {
    const username = String(data.username ?? "").trim();
    const password = String(data.password ?? "");

    if (!username || !password) {
      return ev.fail(400, {
        message: "Invalid username or password",
      });
    }

    const user = getUserByUsername(username);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return ev.fail(401, {
        message: "Invalid username or password",
      });
    }

    const token = createSession(user.username);
    ev.cookie.set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: [7, "days"],
    });

    throw ev.redirect(302, "/dashboard");
  },
  zod$({
    username: z.string().min(1).max(200),
    password: z.string().min(1).max(200),
  })
);

export default component$(() => {
  const action = useLoginAction();

  return (
    <main>
      <h1>Login</h1>
      <Form action={action}>
        <label>
          Username
          <input type="text" name="username" autoComplete="username" required />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit">Sign in</button>
      </Form>
      {action.value?.failed && (
        <p role="alert" data-testid="login-error">
          {action.value.message ?? "Invalid username or password"}
        </p>
      )}
    </main>
  );
});

export const head: DocumentHead = {
  title: "Login",
};