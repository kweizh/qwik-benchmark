import { component$, Slot } from "@builder.io/qwik";
import { useLocation } from "@builder.io/qwik-city";
import { categories } from "../../data/docs";

export default component$(() => {
  const loc = useLocation();

  const categorySlug = loc.params.category;
  const pageSlug = loc.params.slug;

  const activeCategory = categories.find((c) => c.slug === categorySlug);
  const activePage = activeCategory?.pages.find((p) => p.slug === pageSlug);

  return (
    <div class="docs-container">
      {/* Breadcrumb Trail */}
      <nav aria-label="breadcrumb" class="docs-breadcrumb">
        <ol>
          <li>
            <a href="/docs">Docs</a>
          </li>
          {activeCategory && (
            <li>
              <span class="separator">/</span>
              {activePage ? (
                <a href={`/docs/${activeCategory.slug}`}>{activeCategory.title}</a>
              ) : (
                <span aria-current="page">{activeCategory.title}</span>
              )}
            </li>
          )}
          {activePage && (
            <li>
              <span class="separator">/</span>
              <span aria-current="page">{activePage.title}</span>
            </li>
          )}
        </ol>
      </nav>

      <div class="docs-layout">
        {/* Sidebar Navigation */}
        <aside class="docs-sidebar">
          <nav aria-label="sidebar">
            <ul>
              {categories.map((category) => {
                const isActive = category.slug === categorySlug;
                return (
                  <li key={category.slug}>
                    <a
                      href={`/docs/${category.slug}`}
                      aria-current={isActive ? "page" : undefined}
                      class={isActive ? "active" : ""}
                    >
                      {category.title}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main class="docs-content">
          <Slot />
        </main>
      </div>
    </div>
  );
});
