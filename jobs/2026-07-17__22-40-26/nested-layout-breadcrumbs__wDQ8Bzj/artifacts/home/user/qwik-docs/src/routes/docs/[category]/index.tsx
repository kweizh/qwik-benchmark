import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { findCategory } from "../../../data/docs";

interface CategoryPageData {
  category: { slug: string; title: string };
  pages: { slug: string; title: string }[];
}

export const useCategoryLoader = routeLoader$<CategoryPageData>(
  async ({ params, status }) => {
    const slug = params["category"];
    const category = slug ? findCategory(slug) : undefined;
    if (!category) {
      status(404);
      return {
        category: { slug: slug ?? "", title: "" },
        pages: [],
      };
    }
    return {
      category: { slug: category.slug, title: category.title },
      pages: category.pages.map((p) => ({ slug: p.slug, title: p.title })),
    };
  }
);

export default component$(() => {
  const data = useCategoryLoader();

  return (
    <section>
      <h1>{data.value.category.title}</h1>
      <ul>
        {data.value.pages.map((page) => (
          <li key={page.slug}>
            <Link href={`/docs/${data.value.category.slug}/${page.slug}/`}>
              {page.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useCategoryLoader);
  return {
    title: `${data.category.title} | Qwik Documentation`,
    meta: [
      {
        name: "description",
        content: `Pages in the ${data.category.title} category.`,
      },
    ],
  };
};
