#!/usr/bin/env bash
set -euo pipefail

# DevSorcerer Installer
# curl -fsSL https://get.devsorcerer.dev | sh

BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"

echo -e "${BOLD}DevSorcerer Installer${RESET}"
echo "========================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is required. Install from https://nodejs.org${RESET}"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo -e "${RED}Error: Node.js 22+ required. Current: $(node -v)${RESET}"
    echo "  Upgrade: https://nodejs.org"
    exit 1
fi

echo -e "Node.js $(node -v) detected"

# Install via npm
echo -e "\nInstalling DevSorcerer..."
if npm install -g devsorcerer 2>/dev/null; then
    echo -e "${GREEN}Installed from npm registry!${RESET}"
else
    echo -e "${YELLOW}npm registry not available, installing from local...${RESET}"
    npm install -g .
fi

# Verify installation
if command -v devsorcerer &> /dev/null; then
    echo -e "\n${GREEN}DevSorcerer installed successfully!${RESET}"
    echo ""
    echo "Quick start:"
    echo "  devsorcerer start                      # Start collector + dashboard"
    echo "  devsorcerer --help                     # Show all commands"
    echo ""
    echo "Dashboard: http://localhost:3199"
else
    echo -e "${RED}Installation failed. Please check errors above.${RESET}"
    exit 1
fi
