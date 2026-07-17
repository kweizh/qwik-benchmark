import { component$ } from "@builder.io/qwik";
import {
  routeLoader$,
  type DocumentHead,
  type RequestHandler,
} from "@builder.io/qwik-city";
import { getSessionUser } from "~/lib/session";

export const onRequest: RequestHandler = (requestEvent) => {
  const user = getSessionUser(requestEvent);
  if (!user || (user.role !== "ADMIN" && user.role !== "USER")) {
    throw requestEvent.redirect(302, "/unauthorized");
  }
};

export const useUser = routeLoader$((requestEvent) => {
  const user = getSessionUser(requestEvent);
  return user!;
});

export default component$(() => {
  const userSignal = useUser();
  const user = userSignal.value;

  return (
    <div>
      <h1>Profile</h1>
      <p>
        <strong>Name:</strong> {user.name}
      </p>
      <p>
        <strong>Email:</strong> {user.email}
      </p>
      <p>
        <strong>Role:</strong> {user.role}
      </p>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Profile",
};
