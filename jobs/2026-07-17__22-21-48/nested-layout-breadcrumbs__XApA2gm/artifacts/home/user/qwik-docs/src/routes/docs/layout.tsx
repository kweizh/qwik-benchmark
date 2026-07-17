import {
  component$,
  Slot,
  useTask$,
  useSignal,
} from "@builder.io/qwik";
import {
  routeLoader$,
  useLocation,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { categories, findCategory, findPage } from "~/data/docs";

/**
 * Shared layout for every `/docs` route. It renders the breadcrumb bar and the
 * sidebar navigation, both derived from the current route. The actual page
 * content is projected through `<Slot />` so individual routes don't need to
 * repeat the shared chrome.
 *
 * Titles are resolved on the server inside `routeLoader$` from the local data
 * module (`~/data/docs`), never hardcoded.
 */

interface Breadcrumb {
  label: string;
  href: string;
}

export const useBreadcrumbs = routeLoader$(({ params, fail }) => {
  const crumbs: Breadcrumb[] = [{ label: "Docs", href: "/docs" }];

  if (params.category) {
    const category = findCategory(params.category);
    if (!category) {
      fail(404, { message: `Unknown category: ${params.category}` });
      return crumbs;
    }
    crumbs.push({
      label: category.title,
      href: `/docs/${category.slug}`,
    });

    if (params.slug) {
      const page = findPage(params.category, params.slug);
      if (!page) {
        fail(404, { message: `Unknown page: ${params.slug}` });
        return crumbs;
      }
      crumbs.push({
        label: page.title,
        href: `/docs/${category.slug}/${page.slug}`,
      });
    }
  }

  return crumbs;
});

export const useSidebarCategories = routeLoader$(() => {
  return categories.map((category) => ({
    slug: category.slug,
    title: category.title,
  }));
});

export default component$(() => {
  const loc = useLocation();
  const crumbs = useBreadcrumbs();
  const sidebarCategories = useSidebarCategories();

  // The active category slug is the first route segment under `/docs`.
  const activeCategory = useSignal<string>("");

  useTask$(() => {
    const segments = loc.url.pathname.replace(/^\/+|\/+$/g, "").split("/");
    // pathname like "docs/<category>/..."
    activeCategory.value = segments[0] === "docs" ? segments[1] ?? "" : "";
  });

  return (
    <div class="docs-layout">
      <nav aria-label="breadcrumb" class="breadcrumb-bar">
        <ul>
          {crumbs.value.map((crumb, index) => {
            const isLast = index === crumbs.value.length - 1;
            return (
              <li key={crumb.href}>
                {isLast ? (
                  <span aria-current="page">{crumb.label}</span>
                ) : (
                  <a href={crumb.href}>{crumb.label}</a>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div class="docs-body">
        <nav aria-label="sidebar" class="sidebar">
          <ul>
            {sidebarCategories.value.map((category) => {
              const isActive = category.slug === activeCategory.value;
              return (
                <li key={category.slug}>
                  <a
                    href={`/docs/${category.slug}`}
                    {...(isActive ? { "aria-current": "page" } : {})}
                  >
                    {category.title}
                  </a>
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

export const head: DocumentHead = {
  title: "Docs",
};