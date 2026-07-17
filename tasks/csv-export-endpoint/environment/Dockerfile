FROM ubuntu:24.04

ARG POCHI_VERSION
ARG AGENT_BROWSER_VERSION=0.27.3-pochi

RUN apt-get update -y && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        curl wget ca-certificates git python3 python3-pip python3-pytest bash ripgrep build-essential \
        ffmpeg libxcb-shm0 libx11-xcb1 libx11-6 libxcb1 libxext6 libxrandr2 libxcomposite1 libxcursor1 libxdamage1 libxfixes3 libxi6 libgtk-3-0t64 libpangocairo-1.0-0 libpango-1.0-0 libatk1.0-0t64 libcairo-gobject2 libcairo2 libgdk-pixbuf-2.0-0 libxrender1 libasound2t64 libfreetype6 libfontconfig1 libdbus-1-3 libnss3 libnspr4 libatk-bridge2.0-0t64 libdrm2 libxkbcommon0 libatspi2.0-0t64 libcups2t64 libxshmfence1 libgbm1 && \
    ln -s /usr/bin/python3 /usr/bin/python && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
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

# Scaffold a minimal Qwik City app (empty starter) and install dependencies,
# including the local SQLite driver better-sqlite3.
RUN cd /home/user && \
    CI=true npm create qwik@latest empty qwik-app --yes --no-git --no-install && \
    cd /home/user/qwik-app && \
    npm install && \
    npm install better-sqlite3 && \
    npm install --save-dev @types/better-sqlite3

# Seed the local SQLite database with deterministic transaction rows,
# including values that require RFC 4180 CSV escaping (commas, quotes, newline).
RUN python3 - <<'PY'
import os
import sqlite3

os.makedirs('/home/user/qwik-app/data', exist_ok=True)
db_path = '/home/user/qwik-app/data/reports.db'
conn = sqlite3.connect(db_path)
conn.execute(
    "CREATE TABLE IF NOT EXISTS transactions ("
    "id INTEGER PRIMARY KEY, "
    "date TEXT NOT NULL, "
    "category TEXT NOT NULL, "
    "description TEXT NOT NULL, "
    "amount REAL NOT NULL)"
)
conn.execute("DELETE FROM transactions")
rows = [
    (1, '2024-01-05', 'food', 'Coffee, tea, and snacks', 12.5),
    (2, '2024-01-15', 'travel', 'Taxi to "Airport"', 40),
    (3, '2024-02-03', 'food', 'Groceries', 100),
    (4, '2024-02-20', 'office', 'Notebook\nand pens', 8.75),
    (5, '2024-03-10', 'travel', 'Train ticket', 55.2),
    (6, '2024-03-25', 'food', 'Dinner, drinks, and "dessert"', 88.9),
]
conn.executemany(
    "INSERT INTO transactions (id, date, category, description, amount) VALUES (?, ?, ?, ?, ?)",
    rows,
)
conn.commit()
conn.close()
PY

LABEL Author="generate-harbor-tasks"
LABEL Description="Qwik City task environment (Node.js v20) with a scaffolded qwik-app and a seeded local SQLite reports database, including the browser verification environment."

CMD ["/bin/bash", "-c", "trap : TERM INT; sleep infinity & wait"]

# Container contents:
#   - always required apt packages: curl wget ca-certificates git python3 python3-pip python3-pytest bash ripgrep
#   - always required pip3 packages: pytest-json-ctrf
#   - Node.js v20 for the Qwik City task environment (+ build-essential for native modules)
#   - browser verification dependencies: pochi-verifier, agent-browser, ffmpeg, and more
#   - pip3 packages for tests: requests, pytest-xprocess
#   - /home/user/qwik-app: scaffolded Qwik City app (empty starter) with node_modules and better-sqlite3 installed
#   - /home/user/qwik-app/data/reports.db: seeded local SQLite database (table `transactions`, 6 rows)

# Setup entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
