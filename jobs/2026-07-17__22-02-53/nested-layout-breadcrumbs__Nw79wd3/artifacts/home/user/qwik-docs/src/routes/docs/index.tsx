import { component$ } from "@builder.io/qwik";
import { categories } from "../../data/docs";

export default component$(() => {
  return (
    <>
      <h1>Documentation</h1>
      <p>Select a category below to get started:</p>
      <ul class="docs-list">
        {categories.map((category) => (
          <li key={category.slug}>
            <a href={`/docs/${category.slug}`}>{category.title}</a>
            <p>{category.pages.length} pages available</p>
          </li>
        ))}
      </ul>
    </>
  );
});
