FROM ubuntu:24.04

ARG POCHI_VERSION

# Base tooling, Node.js, browser system libraries (for Playwright/Chromium),
# native build toolchain (for better-sqlite3), Pochi CLI, and Python test deps.
RUN apt-get update -y && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        curl wget ca-certificates git python3 python3-pip python3-pytest bash ripgrep \
        build-essential \
        ffmpeg libxcb-shm0 libx11-xcb1 libx11-6 libxcb1 libxext6 libxrandr2 libxcomposite1 libxcursor1 libxdamage1 libxfixes3 libxi6 libgtk-3-0t64 libpangocairo-1.0-0 libpango-1.0-0 libatk1.0-0t64 libcairo-gobject2 libcairo2 libgdk-pixbuf-2.0-0 libxrender1 libasound2t64 libfreetype6 libfontconfig1 libdbus-1-3 libnss3 libnspr4 libatk-bridge2.0-0t64 libdrm2 libxkbcommon0 libatspi2.0-0t64 libcups2t64 libxshmfence1 libgbm1 && \
    ln -s /usr/bin/python3 /usr/bin/python && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    curl -fsSL https://getpochi.com/install.sh | bash -s ${POCHI_VERSION} && \
    ln -s /root/.pochi/bin/pochi /usr/local/bin/pochi && \
    pip3 install --break-system-packages pytest-json-ctrf requests pytest-xprocess playwright && \
    python3 -m playwright install --with-deps chromium && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /home/user && chmod 0755 /home/user

# Scaffold a Qwik City "empty" project (routing, no demo code) with a local
# SQLite driver installed, matching the initial-state expectations.
RUN cd /home/user && \
    CI=true npm create qwik@latest empty optimistic-todo --yes --no-git --no-install && \
    cd optimistic-todo && \
    npm install && \
    npm install better-sqlite3 && \
    npm install -D @types/better-sqlite3 && \
    mkdir -p data

LABEL Author="generate-harbor-tasks"
LABEL Description="Qwik City optimistic-UI todo task environment: Node.js 22, better-sqlite3, and a Playwright/Chromium + pytest verification stack."

CMD ["/bin/bash", "-c", "trap : TERM INT; sleep infinity & wait"]

# Container contents:
#   - always required apt packages: curl wget ca-certificates git python3 python3-pip python3-pytest bash ripgrep
#   - always required pip3 packages: pytest-json-ctrf
#   - Node.js v22 for the Qwik City task environment
#   - build-essential for compiling the better-sqlite3 native module
#   - browser verification via Playwright/Chromium (pip: playwright, requests, pytest-xprocess) + Chromium system libraries
#   - /home/user/optimistic-todo: pre-scaffolded Qwik City "empty" project with dependencies installed (incl. better-sqlite3)
#   - /home/user/optimistic-todo/data: directory for the local SQLite database file (data/todos.sqlite)

# Setup entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
