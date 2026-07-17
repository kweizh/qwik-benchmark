import { component$ } from "@builder.io/qwik";
import {
  type DocumentHead,
  Form,
  routeAction$,
  z,
  zod$,
} from "@builder.io/qwik-city";
import { authenticateUser, createSession } from "~/db.server";

export const useLogin = routeAction$(
  async (values, event) => {
    const username = values.username.trim();
    const password = values.password;

    const user = authenticateUser(username, password);
    if (!user) {
      // Do NOT set the session cookie. Re-render /login with an error.
      return {
        error: "Invalid username or password",
      };
    }

    const token = createSession(user.username);
    event.cookie.set("session", token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
    });

    throw event.redirect(302, "/dashboard");
  },
  zod$(
    z.object({
      username: z.string(),
      password: z.string(),
    }),
  ),
);

export default component$(() => {
  const login = useLogin();

  return (
    <main style={{ maxWidth: "24rem", margin: "4rem auto" }}>
      <h1>Sign in</h1>

      {login.value?.error && (
        <p
          style={{
            color: "#b00020",
            border: "1px solid #b00020",
            padding: "0.5rem 0.75rem",
            borderRadius: "0.25rem",
          }}
        >
          {login.value.error}
        </p>
      )}

      <Form action={login}>
        <div style={{ marginBottom: "1rem" }}>
          <label
            for="username"
            style={{ display: "block", marginBottom: "0.25rem" }}
          >
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            style={{ width: "100%", padding: "0.4rem" }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label
            for="password"
            style={{ display: "block", marginBottom: "0.25rem" }}
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            style={{ width: "100%", padding: "0.4rem" }}
          />
        </div>

        <button type="submit" style={{ padding: "0.5rem 1rem" }}>
          Login
        </button>
      </Form>
    </main>
  );
});

export const head: DocumentHead = {
  title: "Login",
};