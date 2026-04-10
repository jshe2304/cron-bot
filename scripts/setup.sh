#!/usr/bin/env bash
# setup.sh — Bootstrap cron-bot on a new cluster.
# Usage: bash scripts/setup.sh

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE_VERSION="22"  # LTS

echo "==> cron-bot setup"
echo "    repo: $REPO_DIR"

# --- Node.js via nvm ------------------------------------------------------
if command -v node &>/dev/null; then
    echo "==> Node.js already available: $(node --version)"
else
    echo "==> Installing Node.js via nvm..."

    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

    if [[ ! -d "$NVM_DIR" ]]; then
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    fi

    # Source nvm for this session
    . "$NVM_DIR/nvm.sh"

    nvm install "$NODE_VERSION"
    nvm alias default "$NODE_VERSION"
    echo "==> Installed Node.js $(node --version)"
fi

# --- Install project dependencies -----------------------------------------
echo "==> Installing npm dependencies..."
cd "$REPO_DIR"
npm install

echo ""
echo "==> Setup complete."
echo "    Node: $(node --version)"
echo "    npm:  $(npm --version)"
