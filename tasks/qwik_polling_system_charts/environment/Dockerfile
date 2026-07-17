FROM ubuntu:24.04

ARG POCHI_VERSION
ARG AGENT_BROWSER_VERSION=0.27.3-pochi

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
    pip3 install --break-system-packages pytest-json-ctrf pochi-verifier requests pytest-xprocess && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /home/user && chmod 0755 /home/user

# Scaffold Qwik City application and initialize pre-seeded database
RUN cd /home/user && \
    CI=true npm create qwik@latest empty qwik-app --yes --no-git --no-install && \
    cd qwik-app && \
    npm install && \
    npm install better-sqlite3 sqlite3 sqlite && \
    sqlite3 poll.db "CREATE TABLE polls (id TEXT PRIMARY KEY, question TEXT NOT NULL); CREATE TABLE options (id INTEGER PRIMARY KEY AUTOINCREMENT, poll_id TEXT NOT NULL, text TEXT NOT NULL, votes INTEGER NOT NULL DEFAULT 0, FOREIGN KEY (poll_id) REFERENCES polls(id)); CREATE TABLE votes_log (id INTEGER PRIMARY KEY AUTOINCREMENT, poll_id TEXT NOT NULL, ip TEXT NOT NULL, timestamp INTEGER NOT NULL); INSERT INTO polls (id, question) VALUES ('frameworks', 'What is your favorite frontend framework?'); INSERT INTO polls (id, question) VALUES ('colors', 'What is your favorite primary color?'); INSERT INTO options (id, poll_id, text, votes) VALUES (1, 'frameworks', 'Qwik', 0); INSERT INTO options (id, poll_id, text, votes) VALUES (2, 'frameworks', 'React', 0); INSERT INTO options (id, poll_id, text, votes) VALUES (3, 'frameworks', 'Vue', 0); INSERT INTO options (id, poll_id, text, votes) VALUES (4, 'frameworks', 'Svelte', 0); INSERT INTO options (id, poll_id, text, votes) VALUES (5, 'colors', 'Red', 0); INSERT INTO options (id, poll_id, text, votes) VALUES (6, 'colors', 'Blue', 0); INSERT INTO options (id, poll_id, text, votes) VALUES (7, 'colors', 'Yellow', 0);"

LABEL Author="generate-harbor-tasks"
LABEL Description="Qwik Polling System with Dynamic SVG Charts task environment, with Node.js v24, SQLite, and browser verification."

CMD ["/bin/bash", "-c", "trap : TERM INT; sleep infinity & wait"]

# Container contents:
#   - always required apt packages: curl wget ca-certificates git python3 python3-pip python3-pytest bash ripgrep sqlite3 build-essential
#   - always required pip3 packages: pytest-json-ctrf, pytest-xprocess, requests, pochi-verifier
#   - Node.js v24 and npm
#   - /home/user/qwik-app: Qwik City project directory
#   - /home/user/qwik-app/poll.db: Pre-seeded SQLite database
#   - browser verification environment: agent-browser, chrome, etc.

COPY test_initial_state.py /bootstrap/test_initial_state.py

# Setup entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
