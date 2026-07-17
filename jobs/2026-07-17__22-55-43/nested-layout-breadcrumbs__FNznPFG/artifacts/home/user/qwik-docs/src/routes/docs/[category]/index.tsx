import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { useCategoryData } from "./layout";

export default component$(() => {
  const category = useCategoryData();

  return (
    <div>
      <h1>{category.value.title}</h1>
      <ul class="page-list">
        {category.value.pages.map((page) => (
          <li key={page.slug}>
            <a href={`/docs/${category.value.slug}/${page.slug}`}>
              {page.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const category = resolveValue(useCategoryData);
  return {
    title: category.title,
  };
};
