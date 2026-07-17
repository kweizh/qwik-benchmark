FROM ubuntu:24.04

ARG POCHI_VERSION
ARG AGENT_BROWSER_VERSION=0.27.3-pochi

RUN apt-get update -y && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        curl wget ca-certificates git python3 python3-pip python3-pytest bash ripgrep \
        build-essential \
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

# Scaffold an empty Qwik City app (non-interactive command mode), install
# dependencies, add the better-sqlite3 driver, and seed the canonical dataset.
RUN cd /home/user && \
    CI=true npm create qwik@latest empty app && \
    cd /home/user/app && \
    npm install && \
    npm install better-sqlite3 && \
    npm install --save-dev @types/better-sqlite3 && \
    mkdir -p /home/user/app/data

RUN cat > /home/user/app/data/products.json <<'EOF'
[
  { "id": 1,  "name": "Alpha Keyboard",   "category": "Electronics", "price": 49.99,  "stock": 12  },
  { "id": 2,  "name": "Beta Mouse",       "category": "Electronics", "price": 25.50,  "stock": 40  },
  { "id": 3,  "name": "Gamma Monitor",    "category": "Electronics", "price": 199.00, "stock": 7   },
  { "id": 4,  "name": "Sigma Webcam",     "category": "Electronics", "price": 59.99,  "stock": 18  },
  { "id": 5,  "name": "Omega Headset",    "category": "Electronics", "price": 79.00,  "stock": 22  },
  { "id": 6,  "name": "Nano Charger",     "category": "Electronics", "price": 15.00,  "stock": 55  },
  { "id": 7,  "name": "Delta Notebook",   "category": "Books",       "price": 12.00,  "stock": 100 },
  { "id": 8,  "name": "Epsilon Cookbook", "category": "Books",       "price": 30.00,  "stock": 15  },
  { "id": 9,  "name": "Zeta Novel",       "category": "Books",       "price": 9.99,   "stock": 60  },
  { "id": 10, "name": "Pi Dictionary",    "category": "Books",       "price": 45.00,  "stock": 10  },
  { "id": 11, "name": "Rho Atlas",        "category": "Books",       "price": 55.00,  "stock": 8   },
  { "id": 12, "name": "Tau Journal",      "category": "Books",       "price": 8.50,   "stock": 70  },
  { "id": 13, "name": "Eta Lamp",         "category": "Home",        "price": 22.75,  "stock": 25  },
  { "id": 14, "name": "Theta Chair",      "category": "Home",        "price": 89.00,  "stock": 5   },
  { "id": 15, "name": "Iota Blanket",     "category": "Home",        "price": 35.40,  "stock": 30  },
  { "id": 16, "name": "Kappa Rug",        "category": "Home",        "price": 65.00,  "stock": 14  },
  { "id": 17, "name": "Xi Vase",          "category": "Home",        "price": 19.99,  "stock": 33  },
  { "id": 18, "name": "Chi Clock",        "category": "Home",        "price": 42.00,  "stock": 16  },
  { "id": 19, "name": "Puzzle Cube",      "category": "Toys",        "price": 14.20,  "stock": 45  },
  { "id": 20, "name": "Robot Kit",        "category": "Toys",        "price": 27.30,  "stock": 20  },
  { "id": 21, "name": "Toy Drone",        "category": "Toys",        "price": 120.00, "stock": 8   },
  { "id": 22, "name": "Board Game",       "category": "Toys",        "price": 34.99,  "stock": 28  },
  { "id": 23, "name": "Plush Bear",       "category": "Toys",        "price": 18.50,  "stock": 50  },
  { "id": 24, "name": "Race Car",         "category": "Toys",        "price": 22.00,  "stock": 35  }
]
EOF

LABEL Author="generate-harbor-tasks"
LABEL Description="Qwik City app scaffold with better-sqlite3 and a seeded product dataset for a paginated/sortable/searchable server-driven table task, including the browser verification environment."

CMD ["/bin/bash", "-c", "trap : TERM INT; sleep infinity & wait"]

# Container contents:
#   - always required apt packages: curl wget ca-certificates git python3 python3-pip python3-pytest bash ripgrep
#   - always required pip3 packages: pytest-json-ctrf
#   - build-essential for compiling native Node modules (better-sqlite3 fallback)
#   - Node.js v20 for the Qwik City task environment
#   - browser verification dependencies: pochi-verifier, agent-browser, ffmpeg, and more
#   - pip3 packages for tests: requests, pytest-xprocess
#   - /home/user/app: pre-scaffolded empty Qwik City app with deps installed and better-sqlite3 added
#   - /home/user/app/data/products.json: canonical seed dataset (24 products)

# Setup entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
