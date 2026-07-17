FROM ubuntu:24.04

ARG POCHI_VERSION

RUN apt-get update -y && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        curl wget ca-certificates git python3 python3-pip python3-pytest bash ripgrep sqlite3 && \
    ln -s /usr/bin/python3 /usr/bin/python && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    curl -fsSL https://getpochi.com/install.sh | bash -s ${POCHI_VERSION} && \
    ln -s /root/.pochi/bin/pochi /usr/local/bin/pochi && \
    pip3 install --break-system-packages pytest-json-ctrf requests pytest-xprocess && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /home/user && chmod 0755 /home/user

# Scaffold a base Qwik City "empty" project (Qwik + Qwik City routing) and
# install its dependencies, including Prisma and the Prisma client, so the
# environment matches the initial-state expectations. The Prisma engine
# binaries are fetched here at build time so no external network access is
# needed later at task/verification time.
RUN cd /home/user && \
    CI=true npm create qwik@latest empty qwik-blog < /dev/null && \
    cd qwik-blog && \
    npm install && \
    npm install prisma @prisma/client && \
    npm install --save-dev @types/node && \
    test -d node_modules/@builder.io/qwik-city && \
    test -f node_modules/.bin/prisma && \
    test -d src/routes

LABEL Author="generate-harbor-tasks"
LABEL Description="Qwik City + Prisma/SQLite task environment: base 'empty' Qwik City project scaffolded at /home/user/qwik-blog with Prisma installed."

CMD ["/bin/bash", "-c", "trap : TERM INT; sleep infinity & wait"]

# Container contents:
#   - always required apt packages: curl wget ca-certificates git python3 python3-pip python3-pytest bash ripgrep
#   - extra apt packages: sqlite3 (local SQLite CLI), nodejs (Node.js v22 for Qwik/Prisma)
#   - always required pip3 packages: pytest-json-ctrf
#   - extra pip3 packages: requests, pytest-xprocess (used by the final-state HTTP/service tests)
#   - /home/user/qwik-blog: base "empty" Qwik City project (Qwik + Qwik City) with
#       @builder.io/qwik, @builder.io/qwik-city, prisma, and @prisma/client installed
#   - Prisma engine binaries cached during build so runtime needs no external network access

# Setup entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
