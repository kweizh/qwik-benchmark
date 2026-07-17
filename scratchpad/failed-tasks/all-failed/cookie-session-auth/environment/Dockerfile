FROM ubuntu:24.04

ARG POCHI_VERSION

RUN apt-get update -y && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        curl wget ca-certificates git python3 python3-pip python3-pytest bash ripgrep \
        build-essential && \
    ln -s /usr/bin/python3 /usr/bin/python && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    curl -fsSL https://getpochi.com/install.sh | bash -s ${POCHI_VERSION} && \
    ln -s /root/.pochi/bin/pochi /usr/local/bin/pochi && \
    pip3 install --break-system-packages pytest-json-ctrf requests pytest-xprocess && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /home/user && chmod 0755 /home/user

# Scaffold a base Qwik City app (empty starter) with dependencies installed,
# and add better-sqlite3 for local SQLite persistence. Runtime uses only local
# services (SQLite + cookies); no external network access is required at runtime.
RUN cd /home/user && \
    CI=true npm create qwik@latest empty qwik-auth --yes --no-git --no-install && \
    cd qwik-auth && \
    npm install && \
    npm install better-sqlite3 && \
    npm cache clean --force

LABEL Author="generate-harbor-tasks"
LABEL Description="Qwik City task environment (Node.js 22) pre-scaffolded at /home/user/qwik-auth with better-sqlite3 for cookie-based session auth."

CMD ["/bin/bash", "-c", "trap : TERM INT; sleep infinity & wait"]

# Container contents:
#   - always required apt packages: curl wget ca-certificates git python3 python3-pip python3-pytest bash ripgrep
#   - build-essential: native toolchain for compiling better-sqlite3
#   - always required pip3 packages: pytest-json-ctrf
#   - pip3 packages for tests: requests, pytest-xprocess
#   - Node.js v22 for the Qwik City task environment
#   - /home/user/qwik-auth: pre-scaffolded Qwik City "empty" starter with deps installed (incl. @builder.io/qwik, @builder.io/qwik-city, better-sqlite3)

# Setup entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
