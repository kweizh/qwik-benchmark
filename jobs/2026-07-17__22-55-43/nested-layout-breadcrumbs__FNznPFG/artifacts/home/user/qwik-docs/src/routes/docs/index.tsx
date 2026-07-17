import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { useDocsCategories } from "./layout";

export default component$(() => {
  const categories = useDocsCategories();

  return (
    <div>
      <h1>Documentation</h1>
      <ul class="category-list">
        {categories.value.map((category) => (
          <li key={category.slug}>
            <a href={`/docs/${category.slug}`}>{category.title}</a>
          </li>
        ))}
      </ul>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Docs",
  meta: [
    {
      name: "description",
      content: "Browse the documentation categories.",
    },
  ],
};
