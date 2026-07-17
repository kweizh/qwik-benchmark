import { component$ } from "@builder.io/qwik";
import {
  routeLoader$,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { findCategory } from "~/data/docs";

/**
 * `/docs/[category]` — lists the pages in that category.
 * Unknown categories produce a 404 via `fail(404, ...)`.
 */
export const useCategoryPages = routeLoader$(({ params, fail }) => {
  const category = findCategory(params.category);
  if (!category) {
    fail(404, { message: `Unknown category: ${params.category}` });
    return null;
  }
  return {
    title: category.title,
    slug: category.slug,
    pages: category.pages.map((page) => ({
      slug: page.slug,
      title: page.title,
    })),
  };
});

export default component$(() => {
  const data = useCategoryPages();

  if (!data.value) {
    return null;
  }

  const category = data.value;

  return (
    <section>
      <h1>{category.title}</h1>
      <p>Pages in this category:</p>
      <ul class="page-list">
        {category.pages.map((page) => (
          <li key={page.slug}>
            <a href={`/docs/${category.slug}/${page.slug}`}>{page.title}</a>
          </li>
        ))}
      </ul>
    </section>
  );
});

export const head: DocumentHead = {
  title: "Category",
};