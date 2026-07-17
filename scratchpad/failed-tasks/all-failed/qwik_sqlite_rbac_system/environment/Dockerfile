FROM ubuntu:24.04

ARG POCHI_VERSION

# Install always required apt packages, Node.js v24, and Pochi CLI
RUN apt-get update -y && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        curl wget ca-certificates git python3 python3-pip python3-pytest bash ripgrep && \
    ln -s /usr/bin/python3 /usr/bin/python && \
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    curl -fsSL https://getpochi.com/install.sh | bash -s ${POCHI_VERSION} && \
    ln -s /root/.pochi/bin/pochi /usr/local/bin/pochi && \
    pip3 install --break-system-packages pytest-json-ctrf requests beautifulsoup4 pytest-xprocess && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set up the user directory and scaffold the Qwik City project
RUN mkdir -p /home/user && chmod 0755 /home/user && \
    cd /home/user && \
    CI=true npm create qwik@latest empty qwik-app --yes --no-git --no-install && \
    cd /home/user/qwik-app && \
    npm install

LABEL Author="generate-harbor-tasks"
LABEL Description="Qwik City RBAC task environment with Node.js v24 and pre-scaffolded empty Qwik application."

CMD ["/bin/bash", "-c", "trap : TERM INT; sleep infinity & wait"]

# Container contents:
#   - always required apt packages: curl wget ca-certificates git python3 python3-pip python3-pytest bash ripgrep
#   - Node.js v24 installed
#   - python3 standard libraries + requests, beautifulsoup4, pytest-xprocess, pytest-json-ctrf
#   - /home/user/qwik-app: scaffolded empty Qwik City project with dependencies installed

COPY test_initial_state.py /bootstrap/test_initial_state.py

# Setup entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
