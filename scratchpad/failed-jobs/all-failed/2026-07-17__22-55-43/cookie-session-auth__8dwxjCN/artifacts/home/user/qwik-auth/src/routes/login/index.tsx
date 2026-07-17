import { component$ } from "@builder.io/qwik";
import {
  Form,
  routeAction$,
  zod$,
  z,
  type RequestEventAction,
} from "@builder.io/qwik-city";
import { findUserByCredentials, createSession } from "~/auth/db.server";

export const useLoginAction = routeAction$(
  async (data, requestEvent: RequestEventAction) => {
    const user = findUserByCredentials(data.username, data.password);

    if (!user) {
      return requestEvent.fail(401, {
        message: "Invalid username or password",
      });
    }

    const sessionId = createSession(user.id);

    requestEvent.cookie.set("session", sessionId, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
    });

    throw requestEvent.redirect(302, "/dashboard");
  },
  zod$({
    username: z.string().min(1),
    password: z.string().min(1),
  }),
);

export default component$(() => {
  const loginAction = useLoginAction();

  return (
    <div>
      <h1>Login</h1>
      <Form action={loginAction}>
        <div>
          <label for="username">Username</label>
          <input id="username" type="text" name="username" />
        </div>
        <div>
          <label for="password">Password</label>
          <input id="password" type="password" name="password" />
        </div>
        <button type="submit">Log in</button>
      </Form>
      {loginAction.value?.failed && (
        <p role="alert">{loginAction.value.message}</p>
      )}
    </div>
  );
});
