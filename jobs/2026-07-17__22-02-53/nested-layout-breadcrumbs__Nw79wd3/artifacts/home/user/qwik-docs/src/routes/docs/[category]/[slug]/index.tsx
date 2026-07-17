import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { findPage } from "../../../../data/docs";

export const usePageLoader = routeLoader$(async (ev) => {
  const page = findPage(ev.params.category, ev.params.slug);
  if (!page) {
    throw ev.error(404, "Page not found");
  }
  return page;
});

export default component$(() => {
  const pageSignal = usePageLoader();
  const page = pageSignal.value;

  return (
    <>
      <h1>{page.title}</h1>
      <p>{page.body}</p>
    </>
  );
});
