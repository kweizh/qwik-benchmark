FROM ubuntu:24.04

ARG POCHI_VERSION
ARG AGENT_BROWSER_VERSION=0.27.3-pochi

# Install system dependencies, Node.js v24, Pochi CLI, and browser verifier
RUN apt-get update -y && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        curl wget ca-certificates git python3 python3-pip python3-pytest bash ripgrep sqlite3 build-essential \
        ffmpeg libxcb-shm0 libx11-xcb1 libx11-6 libxcb1 libxext6 libxrandr2 libxcomposite1 libxcursor1 libxdamage1 libxfixes3 libxi6 libgtk-3-0t64 libpangocairo-1.0-0 libpango-1.0-0 libatk1.0-0t64 libcairo-gobject2 libcairo2 libgdk-pixbuf-2.0-0 libxrender1 libasound2t64 libfreetype6 libfontconfig1 libdbus-1-3 libnss3 libnspr4 libatk-bridge2.0-0t64 libdrm2 libxkbcommon0 libatspi2.0-0t64 libcups2t64 libxshmfence1 libgbm1 && \
    ln -s /usr/bin/python3 /usr/bin/python && \
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    curl -fsSL https://getpochi.com/install.sh | bash -s ${POCHI_VERSION} && \
    ln -s /root/.pochi/bin/pochi /usr/local/bin/pochi && \
    curl -fsSL https://github.com/TabbyML/agent-browser/releases/download/v${AGENT_BROWSER_VERSION}/install.sh | bash && \
    ln -s /root/.pochi/bin/agent-browser /usr/local/bin/agent-browser && \
    agent-browser install && \
    pip3 install --break-system-packages pytest-json-ctrf pochi-verifier requests && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set up user directory
RUN mkdir -p /home/user && chmod 0755 /home/user

# Scaffold Qwik City application
RUN cd /home/user && \
    CI=true npm create qwik@latest empty qwik-app --yes --no-git --no-install && \
    cd /home/user/qwik-app && \
    npm install && \
    npm install better-sqlite3 && \
    npm install -D @types/better-sqlite3

# Seed the SQLite database
RUN sqlite3 /home/user/qwik-app/form_builder.sqlite "CREATE TABLE forms (id TEXT PRIMARY KEY, schema TEXT);" && \
    sqlite3 /home/user/qwik-app/form_builder.sqlite "CREATE TABLE submissions (id INTEGER PRIMARY KEY AUTOINCREMENT, form_id TEXT, data TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);" && \
    sqlite3 /home/user/qwik-app/form_builder.sqlite "INSERT INTO forms (id, schema) VALUES ('contact_form', '{\"fields\": [{\"name\": \"fullName\", \"type\": \"string\", \"required\": true, \"minLength\": 3}, {\"name\": \"age\", \"type\": \"number\", \"required\": false, \"min\": 18, \"max\": 120}, {\"name\": \"subscribe\", \"type\": \"boolean\", \"required\": false}]}');"

LABEL Author="generate-harbor-tasks"
LABEL Description="Qwik City Dynamic Form Builder task environment with Node.js v24, SQLite, and browser verification."

CMD ["/bin/bash", "-c", "trap : TERM INT; sleep infinity & wait"]

# Container contents:
#   - always required apt packages: curl wget ca-certificates git python3 python3-pip python3-pytest bash ripgrep sqlite3 build-essential
#   - always required pip3 packages: pytest-json-ctrf, requests
#   - Node.js v24 for the Qwik City task environment
#   - browser verification dependencies: pochi-verifier, agent-browser, ffmpeg, and more
#   - /home/user/qwik-app: scaffolded Qwik City project with better-sqlite3 installed
#   - /home/user/qwik-app/form_builder.sqlite: pre-seeded SQLite database with contact_form schema

COPY test_initial_state.py /bootstrap/test_initial_state.py

# Setup entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
