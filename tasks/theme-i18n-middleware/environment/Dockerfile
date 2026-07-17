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

RUN mkdir -p /home/user && chmod 0755 /home/user

# Scaffold a dependency-installed Qwik City "empty" starter at /home/user/qwik-app.
# The scaffolding and dependency install happen at build time (public npm registry
# access is allowed during build); the resulting app runs fully locally at runtime.
RUN cd /home/user && \
    CI=true npm create qwik@latest empty qwik-app --yes --no-git --no-install && \
    cd /home/user/qwik-app && \
    npm install

LABEL Author="generate-harbor-tasks"
LABEL Description="Qwik City SSR task environment (Node.js 22) with a dependency-installed empty Qwik starter at /home/user/qwik-app for building flash-free cookie-based theme + locale preferences."

CMD ["/bin/bash", "-c", "trap : TERM INT; sleep infinity & wait"]

# Container contents:
#   - always required apt packages: curl wget ca-certificates git python3 python3-pip python3-pytest bash ripgrep
#   - always required pip3 packages: pytest-json-ctrf
#   - extra pip3 packages for final-state HTTP verification: requests, pytest-xprocess
#   - Node.js v22 for the Qwik City SSR task environment
#   - /home/user/qwik-app: scaffolded Qwik City "empty" starter with node_modules installed

# Setup entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
