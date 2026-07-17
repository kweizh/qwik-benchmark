import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { categories } from "~/data/docs";

/**
 * `/docs` — lists all categories.
 */
export const useCategories = routeLoader$(() => {
  return categories.map((category) => ({
    slug: category.slug,
    title: category.title,
    pageCount: category.pages.length,
  }));
});

export default component$(() => {
  const categoriesList = useCategories();

  return (
    <section>
      <h1>Documentation</h1>
      <p>Browse the documentation by category.</p>
      <ul class="category-list">
        {categoriesList.value.map((category) => (
          <li key={category.slug}>
            <a href={`/docs/${category.slug}`}>
              <h2>{category.title}</h2>
              <p>{category.pageCount} pages</p>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
});

export const head: DocumentHead = {
  title: "Docs",
  meta: [
    {
      name: "description",
      content: "Browse all documentation categories.",
    },
  ],
};