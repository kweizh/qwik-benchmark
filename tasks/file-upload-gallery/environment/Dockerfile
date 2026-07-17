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

# Scaffold a minimal Qwik City app (empty starter) and install its dependencies,
# so the environment starts as a bootable, dependency-installed Qwik City project.
RUN cd /home/user && \
    npx -y create-qwik@latest empty qwik-gallery && \
    cd /home/user/qwik-gallery && \
    npm install

LABEL Author="generate-harbor-tasks"
LABEL Description="Qwik City image upload gallery task environment with Node.js v22 and a pre-scaffolded, dependency-installed Qwik City empty starter at /home/user/qwik-gallery."

CMD ["/bin/bash", "-c", "trap : TERM INT; sleep infinity & wait"]

# Container contents:
#   - always required apt packages: curl wget ca-certificates git python3 python3-pip python3-pytest bash ripgrep
#   - always required pip3 packages: pytest-json-ctrf
#   - extra pip3 packages for verification: requests, pytest-xprocess
#   - Node.js v22 for the Qwik / Qwik City task environment
#   - /home/user/qwik-gallery: pre-scaffolded Qwik City "empty" starter with dependencies installed via npm

# Setup entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
