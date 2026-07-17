import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { findPage } from "../../../../data/docs";

interface PageData {
  category: { slug: string; title: string };
  page: { slug: string; title: string; body: string };
}

export const usePageLoader = routeLoader$<PageData>(
  async ({ params, status }) => {
    const categorySlug = params["category"];
    const pageSlug = params["slug"];
    const page =
      categorySlug && pageSlug ? findPage(categorySlug, pageSlug) : undefined;
    if (!page) {
      status(404);
      return {
        category: { slug: categorySlug ?? "", title: "" },
        page: { slug: pageSlug ?? "", title: "", body: "" },
      };
    }
    return {
      category: { slug: categorySlug!, title: "" },
      page: { slug: page.slug, title: page.title, body: page.body },
    };
  }
);

export default component$(() => {
  const data = usePageLoader();
  return (
    <article>
      <h1>{data.value.page.title}</h1>
      <p>{data.value.page.body}</p>
    </article>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(usePageLoader);
  return {
    title: `${data.page.title} | Qwik Documentation`,
    meta: [
      {
        name: "description",
        content: data.page.body,
      },
    ],
  };
};
