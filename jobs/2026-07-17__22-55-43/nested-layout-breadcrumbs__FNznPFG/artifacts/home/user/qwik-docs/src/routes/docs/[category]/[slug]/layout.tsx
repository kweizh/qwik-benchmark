import { component$, Slot } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { findPage } from "~/data/docs";

/**
 * Guards the `/docs/[category]/[slug]` route. Requesting an unknown page
 * slug (within a valid category) responds with a 404.
 */
export const usePageGuard = routeLoader$((requestEvent) => {
  const page = findPage(requestEvent.params.category, requestEvent.params.slug);

  if (!page) {
    return requestEvent.fail(404, {
      message: `Page "${requestEvent.params.slug}" not found`,
    });
  }

  return null;
});

/**
 * Resolves the current page data for the page component. Only ever called
 * after `usePageGuard` has confirmed the page exists.
 */
export const usePageData = routeLoader$((requestEvent) => {
  return findPage(requestEvent.params.category, requestEvent.params.slug)!;
});

export default component$(() => {
  return <Slot />;
});
