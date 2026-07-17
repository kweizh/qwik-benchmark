import { component$, Slot } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { findCategory } from "../../../data/docs";

export const useCategoryLoader = routeLoader$(async (ev) => {
  const category = findCategory(ev.params.category);
  if (!category) {
    throw ev.error(404, "Category not found");
  }
  return category;
});

export default component$(() => {
  return <Slot />;
});
