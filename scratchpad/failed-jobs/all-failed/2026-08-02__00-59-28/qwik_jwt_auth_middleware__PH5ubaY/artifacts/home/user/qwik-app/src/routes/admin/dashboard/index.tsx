import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

export const useUser = routeLoader$(({ sharedMap }) => {
  return sharedMap.get("user") as { username: string; role: string };
});

export default component$(() => {
  const user = useUser();
  return <div>Welcome to the Admin Dashboard, {user.value.username}!</div>;
});
