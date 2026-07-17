export interface DocPage {
  slug: string;
  title: string;
  body: string;
}

export interface DocCategory {
  slug: string;
  title: string;
  pages: DocPage[];
}

export const categories: DocCategory[] = [
  {
    slug: 'getting-started',
    title: 'Getting Started',
    pages: [
      {
        slug: 'installation',
        title: 'Installation',
        body: 'Install Qwik using the create-qwik CLI.',
      },
      {
        slug: 'project-structure',
        title: 'Project Structure',
        body: 'The routes directory maps files to URLs.',
      },
    ],
  },
  {
    slug: 'components',
    title: 'Components',
    pages: [
      {
        slug: 'overview',
        title: 'Component Overview',
        body: 'Components are declared with the component$ function.',
      },
      {
        slug: 'state',
        title: 'State Management',
        body: 'Use useSignal and useStore to manage reactive state.',
      },
    ],
  },
  {
    slug: 'routing',
    title: 'Routing',
    pages: [
      {
        slug: 'layouts',
        title: 'Nested Layouts',
        body: 'Layouts wrap child routes using the Slot component.',
      },
      {
        slug: 'loaders',
        title: 'Route Loaders',
        body: 'The routeLoader$ function loads data on the server.',
      },
    ],
  },
];

export function findCategory(slug: string): DocCategory | undefined {
  return categories.find((category) => category.slug === slug);
}

export function findPage(
  categorySlug: string,
  pageSlug: string
): DocPage | undefined {
  return findCategory(categorySlug)?.pages.find((page) => page.slug === pageSlug);
}
