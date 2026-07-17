FROM ubuntu:24.04

ARG POCHI_VERSION

# Install required system packages
RUN apt-get update -y && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        curl wget ca-certificates git python3 python3-pip python3-pytest bash ripgrep && \
    ln -s /usr/bin/python3 /usr/bin/python && \
    # Install Node.js v24
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    # Install Pochi CLI
    curl -fsSL https://getpochi.com/install.sh | bash -s ${POCHI_VERSION} && \
    ln -s /root/.pochi/bin/pochi /usr/local/bin/pochi && \
    # Install required pip packages
    pip3 install --break-system-packages pytest-json-ctrf requests beautifulsoup4 pytest-xprocess && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create user directory
RUN mkdir -p /home/user && chmod 0755 /home/user

# Scaffold Qwik City application
RUN cd /home/user && \
    CI=true npm create qwik@latest empty qwik-app --yes --no-git --no-install && \
    cd qwik-app && \
    npm install

# Create translation files
RUN mkdir -p /home/user/qwik-app/locales && \
    cat >/home/user/qwik-app/locales/en.json <<'EOF'
{
  "dashboard": {
    "title": "Dashboard",
    "welcome": "Welcome to your dashboard, {name}!"
  },
  "profile": {
    "title": "User Profile",
    "email_label": "Email Address"
  }
}
EOF

RUN cat >/home/user/qwik-app/locales/fr.json <<'EOF'
{
  "dashboard": {
    "title": "Tableau de bord",
    "welcome": "Bienvenue sur votre tableau de bord, {name}!"
  },
  "profile": {
    "title": "Profil de l'utilisateur",
    "email_label": "Adresse e-mail"
  }
}
EOF

LABEL Author="generate-harbor-tasks"
LABEL Description="Qwik City dynamic i18n localization task environment with Node.js v24, Pochi CLI, and initial locale JSON files."

CMD ["/bin/bash", "-c", "trap : TERM INT; sleep infinity & wait"]

# Container contents:
#   - always required apt packages: curl wget ca-certificates git python3 python3-pip python3-pytest bash ripgrep
#   - always required pip3 packages: pytest-json-ctrf
#   - other pip3 packages: requests, beautifulsoup4, pytest-xprocess
#   - Node.js v24 for running Qwik application
#   - /home/user/qwik-app: scaffolded Qwik City project
#   - /home/user/qwik-app/locales/en.json: initial English translation file
#   - /home/user/qwik-app/locales/fr.json: initial French translation file

COPY test_initial_state.py /bootstrap/test_initial_state.py

# Setup entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
