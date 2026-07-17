import { component$, Slot } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { findCategory } from "~/data/docs";

/**
 * Guards every route nested under `/docs/[category]`. Requesting an unknown
 * category responds with a 404 and aborts rendering of the route tree.
 */
export const useCategoryGuard = routeLoader$((requestEvent) => {
  const category = findCategory(requestEvent.params.category);

  if (!category) {
    return requestEvent.fail(404, {
      message: `Category "${requestEvent.params.category}" not found`,
    });
  }

  return null;
});

/**
 * Resolves the current category data for use by nested pages. Only ever
 * called after `useCategoryGuard` has confirmed the category exists.
 */
export const useCategoryData = routeLoader$((requestEvent) => {
  return findCategory(requestEvent.params.category)!;
});

export default component$(() => {
  return <Slot />;
});
