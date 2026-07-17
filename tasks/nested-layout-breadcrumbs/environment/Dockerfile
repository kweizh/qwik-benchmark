FROM ubuntu:24.04

ARG POCHI_VERSION

RUN apt-get update -y && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        curl wget ca-certificates git python3 python3-pip python3-pytest bash ripgrep && \
    ln -s /usr/bin/python3 /usr/bin/python && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    curl -fsSL https://getpochi.com/install.sh | bash -s ${POCHI_VERSION} && \
    ln -s /root/.pochi/bin/pochi /usr/local/bin/pochi && \
    pip3 install --break-system-packages pytest-json-ctrf requests pytest-xprocess && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Avoid git failures during project scaffolding.
RUN git config --global user.email "task@example.com" && \
    git config --global user.name "Harbor Task" && \
    git config --global init.defaultBranch main

RUN mkdir -p /home/user && chmod 0755 /home/user

# Scaffold an empty Qwik City project (routing included, no demo code) and install deps.
RUN cd /home/user && \
    CI=true npm create qwik@latest empty qwik-docs && \
    cd qwik-docs && \
    npm install

# Provide the local documentation data module. This is the single source of truth
# for all category/page titles used by the breadcrumb and sidebar navigation.
RUN mkdir -p /home/user/qwik-docs/src/data && \
    cat > /home/user/qwik-docs/src/data/docs.ts <<'DOCSEOF'
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
DOCSEOF

LABEL Author="generate-harbor-tasks"
LABEL Description="Qwik City project scaffold at /home/user/qwik-docs with a local docs data module for building nested layouts and auto-generated breadcrumbs."

CMD ["/bin/bash", "-c", "trap : TERM INT; sleep infinity & wait"]

# Container contents:
#   - always required apt packages: curl wget ca-certificates git python3 python3-pip python3-pytest bash ripgrep
#   - always required pip3 packages: pytest-json-ctrf
#   - Node.js v22 for the Qwik / Qwik City task environment
#   - pip3 test deps: requests, pytest-xprocess (used by tests/test_final_state.py)
#   - /home/user/qwik-docs: pre-scaffolded empty Qwik City project with dependencies installed
#   - /home/user/qwik-docs/src/data/docs.ts: provided local documentation data module (titles source of truth)

# Setup entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
