import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { categories } from "../../data/docs";

export const useCategoriesLoader = routeLoader$(async () => {
  return categories.map((c) => ({
    slug: c.slug,
    title: c.title,
    pages: c.pages.map((p) => ({ slug: p.slug, title: p.title })),
  }));
});

export default component$(() => {
  const cats = useCategoriesLoader();

  return (
    <section>
      <h1>Documentation</h1>
      <p>Browse the documentation by category.</p>
      <ul>
        {cats.value.map((category) => (
          <li key={category.slug}>
            <Link href={`/docs/${category.slug}/`}>{category.title}</Link>
            <span> ({category.pages.length} pages)</span>
          </li>
        ))}
      </ul>
    </section>
  );
});

export const head: DocumentHead = {
  title: "Docs | Qwik Documentation",
  meta: [
    {
      name: "description",
      content: "Browse Qwik documentation by category.",
    },
  ],
};
