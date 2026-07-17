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

# Scaffold an empty Qwik City project (Qwik + Qwik City routing) and install
# dependencies so the environment starts in the state validated by
# test_initial_state.py. create-qwik is pinned to a v1 release that scaffolds the
# @builder.io/qwik / @builder.io/qwik-city packages in non-interactive command mode.
RUN cd /home/user && \
    CI=true npm create -y qwik@1.20.0 empty qwik-app && \
    cd /home/user/qwik-app && \
    npm install

LABEL Author="generate-harbor-tasks"
LABEL Description="Qwik City task environment (Node.js 22) with a pre-scaffolded empty Qwik City app at /home/user/qwik-app for building a rate-limited JSON API."

CMD ["/bin/bash", "-c", "trap : TERM INT; sleep infinity & wait"]

# Container contents:
#   - always required apt packages: curl wget ca-certificates git python3 python3-pip python3-pytest bash ripgrep
#   - always required pip3 packages: pytest-json-ctrf
#   - Node.js v22 for the Qwik City task environment
#   - pip3 packages for verification: requests, pytest-xprocess
#   - /home/user/qwik-app: pre-scaffolded empty Qwik City project with dependencies installed

# Setup entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
