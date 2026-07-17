import { component$ } from "@builder.io/qwik";
import {
  Form,
  routeAction$,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { deleteSession } from "~/lib/auth.server";
import { useCurrentUser } from "../layout";

export const useLogoutAction = routeAction$(async (_data, ev) => {
  const token = ev.cookie.get("session")?.value;
  deleteSession(token);
  ev.cookie.delete("session", { path: "/" });
  throw ev.redirect(302, "/login");
});

export default component$(() => {
  const user = useCurrentUser();
  const logout = useLogoutAction();

  return (
    <main>
      <h1>Dashboard</h1>
      <p>
        Signed in as{" "}
        <strong data-testid="dashboard-username">
          {user.value.username}
        </strong>
      </p>
      <Form action={logout}>
        <input type="hidden" name="action" value="logout" />
        <button type="submit">Log out</button>
      </Form>
    </main>
  );
});

export const head: DocumentHead = {
  title: "Dashboard",
};