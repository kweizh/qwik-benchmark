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

# Scaffold a base Qwik City "empty" starter (routing included, no demo code) and
# install its dependencies so the environment matches the initial-state tests.
# create-qwik command mode (`create-qwik <starter> <projectName>`) is fully
# non-interactive: it only copies the starter files, without prompting, running
# git init, or installing dependencies.
RUN cd /home/user && \
    npm exec -y -- create-qwik@1.20.0 empty qwik-app && \
    cd /home/user/qwik-app && \
    npm install && \
    npm cache clean --force

LABEL Author="generate-harbor-tasks"
LABEL Description="Qwik City (Qwik 1.x) empty starter at /home/user/qwik-app with Node.js 22 for building an SSE-based collaborative notepad."

CMD ["/bin/bash", "-c", "trap : TERM INT; sleep infinity & wait"]

# Container contents:
#   - always required apt packages: curl wget ca-certificates git python3 python3-pip python3-pytest bash ripgrep
#   - always required pip3 packages: pytest-json-ctrf
#   - extra pip3 packages for tests: requests, pytest-xprocess
#   - Node.js v22 for the Qwik/Qwik City task environment
#   - /home/user/qwik-app: pre-scaffolded Qwik City "empty" starter with dependencies installed (node_modules present)

# Setup entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
