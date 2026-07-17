import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

export const useRedirectLoader = routeLoader$((requestEvent) => {
  throw requestEvent.redirect(302, '/articles/');
});

export default component$(() => {
  return null;
});
