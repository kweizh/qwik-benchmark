import { component$ } from "@builder.io/qwik";
import { Form, routeAction$ } from "@builder.io/qwik-city";
import { useUserLoader } from "../layout";
import { deleteSession } from "../../../auth.server";

export const useLogoutAction = routeAction$((_data, event) => {
  const sessionCookie = event.cookie.get("session")?.value;
  if (sessionCookie) {
    deleteSession(sessionCookie);
    event.cookie.delete("session", { path: "/" });
  }
  throw event.redirect(302, "/login");
});

export default component$(() => {
  const user = useUserLoader();
  const logoutAction = useLogoutAction();

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Dashboard</h1>
      <p>Logged in as: <strong>{user.value.username}</strong></p>
      <Form action={logoutAction}>
        <button type="submit" style={{ padding: "8px 16px", cursor: "pointer" }}>
          Logout
        </button>
      </Form>
    </div>
  );
});
