import { component$ } from "@builder.io/qwik";
import {
  routeLoader$,
  type DocumentHead,
  type RequestHandler,
} from "@builder.io/qwik-city";
import { verifyJwt } from "~/lib/jwt";

/**
 * The `onRequest` middleware in `src/routes/admin/layout.tsx` already
 * guarantees that only requests with a valid admin JWT reach this route,
 * but we re-verify here as a defense-in-depth measure.
 */
export const onGet: RequestHandler = (requestEvent) => {
  const token = requestEvent.cookie.get("jwt_token")?.value;
  const payload = verifyJwt(token);

  if (!payload || payload.role !== "admin") {
    throw requestEvent.redirect(302, "/login");
  }
};

export const useAuthUser = routeLoader$((requestEvent) => {
  const token = requestEvent.cookie.get("jwt_token")?.value;
  const payload = verifyJwt(token);
  return { username: payload?.username ?? "admin" };
});

export default component$(() => {
  const authUser = useAuthUser();

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Welcome to the Admin Dashboard, {authUser.value.username}!</p>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Admin Dashboard",
};
