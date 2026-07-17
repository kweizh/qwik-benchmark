FROM ubuntu:24.04

ARG POCHI_VERSION

RUN apt-get update -y && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        curl wget ca-certificates git python3 python3-pip python3-pytest bash ripgrep \
        build-essential && \
    ln -s /usr/bin/python3 /usr/bin/python && \
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    curl -fsSL https://getpochi.com/install.sh | bash -s ${POCHI_VERSION} && \
    ln -s /root/.pochi/bin/pochi /usr/local/bin/pochi && \
    pip3 install --break-system-packages pytest-json-ctrf pytest-xprocess requests && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /home/user && chmod 0755 /home/user
RUN mkdir -p /home/user/qwik-app

LABEL Author="generate-harbor-tasks"
LABEL Description="Qwik City Kanban board task environment with Node.js v24 and a local SQLite-capable toolchain. No external services required."

CMD ["/bin/bash", "-c", "trap : TERM INT; sleep infinity & wait"]

# Container contents:
#   - always required apt packages: curl wget ca-certificates git python3 python3-pip python3-pytest bash ripgrep
#   - build-essential: toolchain for building native Node modules (e.g., better-sqlite3) if the agent chooses one
#   - Node.js v24: runtime for the Qwik City app (includes built-in node:sqlite; supports better-sqlite3)
#   - always required pip3 packages: pytest-json-ctrf
#   - verification pip3 packages: pytest-xprocess (manages the dev server), requests (HTTP API/SSR checks)
#   - /home/user/qwik-app: empty project directory where the agent builds the Qwik City Kanban app

# Setup entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
