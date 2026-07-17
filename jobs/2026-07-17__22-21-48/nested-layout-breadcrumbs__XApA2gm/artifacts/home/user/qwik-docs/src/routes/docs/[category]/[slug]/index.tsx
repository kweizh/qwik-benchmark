import { component$ } from "@builder.io/qwik";
import {
  routeLoader$,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { findPage } from "~/data/docs";

/**
 * `/docs/[category]/[slug]` — renders a single page's title and body.
 * Unknown categories or page slugs produce a 404 via `fail(404, ...)`.
 */
export const usePage = routeLoader$(({ params, fail }) => {
  const page = findPage(params.category, params.slug);
  if (!page) {
    fail(404, { message: `Unknown page: ${params.slug}` });
    return null;
  }
  return {
    title: page.title,
    body: page.body,
  };
});

export default component$(() => {
  const page = usePage();

  if (!page.value) {
    return null;
  }

  return (
    <article>
      <h1>{page.value.title}</h1>
      <p>{page.value.body}</p>
    </article>
  );
});

export const head: DocumentHead = {
  title: "Page",
};