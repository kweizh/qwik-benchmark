import { component$, Slot } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { categories, findCategory, findPage } from "~/data/docs";
import { Breadcrumb, type Crumb } from "~/components/breadcrumb/breadcrumb";
import { Sidebar } from "~/components/sidebar/sidebar";

/**
 * Lightweight list of categories (slug + title) used to render the
 * sidebar navigation. Resolved on the server from the local data module.
 */
export const useDocsCategories = routeLoader$(() => {
  return categories.map((category) => ({
    slug: category.slug,
    title: category.title,
  }));
});

/**
 * Builds the breadcrumb trail for the current request based on the
 * `category` / `slug` route params. Always starts with a `Docs` crumb.
 *
 * Note: unknown category/page slugs are turned into a 404 response by the
 * nested `[category]/layout.tsx` and `[category]/[slug]/layout.tsx` loaders,
 * so the fallback labels here are only ever used transiently.
 */
export const useBreadcrumbTrail = routeLoader$((requestEvent): Crumb[] => {
  const { category: categorySlug, slug: pageSlug } = requestEvent.params;
  const crumbs: Crumb[] = [{ label: "Docs", href: "/docs" }];

  if (categorySlug) {
    const category = findCategory(categorySlug);
    crumbs.push({
      label: category?.title ?? categorySlug,
      href: `/docs/${categorySlug}`,
    });

    if (pageSlug) {
      const page = category ? findPage(categorySlug, pageSlug) : undefined;
      crumbs.push({
        label: page?.title ?? pageSlug,
        href: `/docs/${categorySlug}/${pageSlug}`,
      });
    }
  }

  return crumbs;
});

export default component$(() => {
  const crumbs = useBreadcrumbTrail();
  const docsCategories = useDocsCategories();

  return (
    <div class="docs-layout">
      <Breadcrumb crumbs={crumbs.value} />
      <div class="docs-body">
        <Sidebar categories={docsCategories.value} />
        <main class="docs-content">
          <Slot />
        </main>
      </div>
    </div>
  );
});
