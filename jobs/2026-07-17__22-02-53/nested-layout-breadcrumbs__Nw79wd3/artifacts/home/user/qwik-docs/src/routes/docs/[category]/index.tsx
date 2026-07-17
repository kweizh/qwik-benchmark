import { component$ } from "@builder.io/qwik";
import { useCategoryLoader } from "./layout";

export default component$(() => {
  const categorySignal = useCategoryLoader();
  const category = categorySignal.value;

  return (
    <>
      <h1>{category.title}</h1>
      <p>Select a page from this category:</p>
      <ul class="pages-list">
        {category.pages.map((page) => (
          <li key={page.slug}>
            <a href={`/docs/${category.slug}/${page.slug}`}>{page.title}</a>
          </li>
        ))}
      </ul>
    </>
  );
});
