import { routeLoader$ } from "@builder.io/qwik-city";

export const useRedirect = routeLoader$(({ redirect }) => {
  throw redirect(302, "/notes");
});
