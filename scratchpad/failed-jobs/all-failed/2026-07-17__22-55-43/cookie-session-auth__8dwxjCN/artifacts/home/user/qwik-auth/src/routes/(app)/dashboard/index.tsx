import { component$ } from "@builder.io/qwik";
import {
  Form,
  routeAction$,
  type RequestEventAction,
} from "@builder.io/qwik-city";
import { deleteSession } from "~/auth/db.server";
import { useAuthenticatedUser } from "../layout";

export const useLogoutAction = routeAction$(
  async (_data, requestEvent: RequestEventAction) => {
    const sessionId = requestEvent.cookie.get("session")?.value;
    deleteSession(sessionId);
    requestEvent.cookie.delete("session", { path: "/" });
    throw requestEvent.redirect(302, "/login");
  },
);

export default component$(() => {
  const user = useAuthenticatedUser();
  const logoutAction = useLogoutAction();

  return (
    <div>
      <h1>Dashboard</h1>
      <p>
        Logged in as <strong>{user.value.username}</strong>
      </p>
      <Form action={logoutAction}>
        <button type="submit">Log out</button>
      </Form>
    </div>
  );
});
