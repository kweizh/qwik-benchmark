import { component$ } from "@builder.io/qwik";

export interface Crumb {
  label: string;
  href: string;
}

interface BreadcrumbProps {
  crumbs: Crumb[];
}

export const Breadcrumb = component$<BreadcrumbProps>(({ crumbs }) => {
  return (
    <nav aria-label="breadcrumb" class="breadcrumb">
      <ol class="breadcrumb-list">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={crumb.href} class="breadcrumb-item">
              {isLast ? (
                <span aria-current="page">{crumb.label}</span>
              ) : (
                <a href={crumb.href}>{crumb.label}</a>
              )}
              {!isLast && <span class="breadcrumb-separator"> / </span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
});
