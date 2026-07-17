import { component$ } from "@builder.io/qwik";
import {
  type DocumentHead,
  Form,
  routeAction$,
  routeLoader$,
} from "@builder.io/qwik-city";
import { deleteSession, getSessionUser } from "~/db.server";

/**
 * Loads the authenticated user for the dashboard. The layout middleware
 * (`onRequest` in `src/routes/(app)/layout.tsx`) has already verified the
 * session cookie by the time this runs, but we re-resolve it here so the
 * page can display the logged-in username.
 */
export const useUser = routeLoader$(async (event) => {
  const token = event.cookie.get("session")?.value;
  if (!token) throw event.redirect(302, "/login");
  const username = getSessionUser(token);
  if (!username) throw event.redirect(302, "/login");
  return { username };
});

export const useLogout = routeAction$(async (_values, event) => {
  const token = event.cookie.get("session")?.value;
  if (token) {
    deleteSession(token);
  }
  event.cookie.delete("session", { path: "/" });
  throw event.redirect(302, "/login");
});

export default component$(() => {
  const user = useUser();
  const logout = useLogout();

  return (
    <main style={{ maxWidth: "32rem", margin: "4rem auto" }}>
      <h1>Dashboard</h1>
      <p>
        Welcome, <strong>{user.value.username}</strong>!
      </p>

      <Form action={logout}>
        <button type="submit" style={{ padding: "0.4rem 1rem" }}>
          Logout
        </button>
      </Form>
    </main>
  );
});

export const head: DocumentHead = {
  title: "Dashboard",
};