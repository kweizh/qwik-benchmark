import { component$ } from "@builder.io/qwik";
import { useLocation } from "@builder.io/qwik-city";

interface SidebarCategory {
  slug: string;
  title: string;
}

interface SidebarProps {
  categories: SidebarCategory[];
}

export const Sidebar = component$<SidebarProps>(({ categories }) => {
  const location = useLocation();
  const activeCategorySlug = location.params.category;

  return (
    <nav aria-label="sidebar" class="sidebar">
      <ul class="sidebar-list">
        {categories.map((category) => {
          const isActive = category.slug === activeCategorySlug;
          return (
            <li key={category.slug}>
              <a
                href={`/docs/${category.slug}`}
                aria-current={isActive ? "page" : undefined}
              >
                {category.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
});
