import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import type { DocumentHead } from "@builder.io/qwik-city";
import { getSessionUser } from "~/lib/auth";

export const useProfileLoader = routeLoader$(async (requestEvent) => {
  const user = getSessionUser(requestEvent.cookie);

  if (!user || (user.role !== "ADMIN" && user.role !== "USER")) {
    // Unauthenticated or unauthorized: redirect away from the profile page.
    throw requestEvent.redirect(302, "/unauthorized");
  }

  requestEvent.status(200);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
});

export default component$(() => {
  const profile = useProfileLoader();

  return (
    <div>
      <h1>Profile</h1>
      <ul>
        <li>
          <strong>Name:</strong> {profile.value.name}
        </li>
        <li>
          <strong>Email:</strong> {profile.value.email}
        </li>
        <li>
          <strong>Role:</strong> {profile.value.role}
        </li>
      </ul>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Profile",
};
