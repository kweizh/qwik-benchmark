import { component$, Slot } from "@builder.io/qwik";
import { Link, routeLoader$, useLocation } from "@builder.io/qwik-city";
import {
  categories,
  findCategory,
  findPage,
} from "../../data/docs";

export interface DocsLayoutData {
  categories: { slug: string; title: string }[];
  category: { slug: string; title: string } | null;
  page: { slug: string; title: string } | null;
}

export const useDocsLayoutData = routeLoader$<DocsLayoutData>(
  async ({ params, status }) => {
    const categorySlug = params["category"];
    const pageSlug = params["slug"];

    const categoryItems = categories.map((c) => ({
      slug: c.slug,
      title: c.title,
    }));

    let activeCategory:
      | { slug: string; title: string }
      | null = null;
    if (categorySlug) {
      const found = findCategory(categorySlug);
      if (!found) {
        status(404);
        return {
          categories: categoryItems,
          category: null,
          page: null,
        };
      }
      activeCategory = { slug: found.slug, title: found.title };
    }

    let activePage: { slug: string; title: string } | null = null;
    if (categorySlug && pageSlug && activeCategory) {
      const found = findPage(categorySlug, pageSlug);
      if (!found) {
        status(404);
        return {
          categories: categoryItems,
          category: activeCategory,
          page: null,
        };
      }
      activePage = { slug: found.slug, title: found.title };
    }

    return {
      categories: categoryItems,
      category: activeCategory,
      page: activePage,
    };
  }
);

export default component$(() => {
  const data = useDocsLayoutData();
  const loc = useLocation();

  // Derive the breadcrumb trail purely from the current URL segments.
  // The titles for non-home crumbs are resolved on the server via the loader.
  const segments = loc.url.pathname.split("/").filter(Boolean);
  const depth = segments.length; // 1 -> /docs, 2 -> /docs/<cat>, 3 -> /docs/<cat>/<slug>

  const activeCategorySlug = data.value.category
    ? data.value.category.slug
    : null;

  return (
    <div class="docs-shell">
      <nav aria-label="breadcrumb" class="docs-breadcrumb">
        <ol>
          <li>
            <Link href="/docs/">Docs</Link>
          </li>
          {depth >= 2 && data.value.category && (
            <li>
              <Link href={`/docs/${data.value.category.slug}/`}>
                {data.value.category.title}
              </Link>
            </li>
          )}
          {depth >= 3 && data.value.page && (
            <li aria-current="page">{data.value.page.title}</li>
          )}
        </ol>
      </nav>

      <div class="docs-body">
        <nav aria-label="sidebar" class="docs-sidebar">
          <ul>
            {data.value.categories.map((category) => {
              const isActive = category.slug === activeCategorySlug;
              return (
                <li key={category.slug}>
                  <Link
                    href={`/docs/${category.slug}/`}
                    {...(isActive
                      ? { "aria-current": "page" as const }
                      : {})}
                  >
                    {category.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main class="docs-content">
          <Slot />
        </main>
      </div>
    </div>
  );
});
