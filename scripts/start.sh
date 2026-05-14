#!/usr/bin/env bash
# DevTwin — quick start: import sessions + launch dashboard
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DB_PATH="$PROJECT_DIR/.vault/devsorcerer.sqlite"

echo "DevTwin Starter"
echo "==============="

# 1. Import any new Claude Code sessions
echo "[1/2] Importing sessions..."
node "$SCRIPT_DIR/import-sessions.mjs"
echo ""

# 2. Start dashboard (kill existing first)
echo "[2/2] Starting dashboard..."
# Kill any existing dashboard on port 3199
PID=$(netstat -ano 2>/dev/null | grep ':3199' | grep LISTENING | awk '{print $NF}' | head -1)
if [ -n "$PID" ]; then
  echo "  Stopping existing dashboard (PID: $PID)..."
  taskkill //PID "$PID" //F 2>/dev/null || true
  sleep 1
fi

cd "$PROJECT_DIR"
devsorcerer start --headless &
sleep 2

echo ""
echo "Dashboard: http://localhost:3199"
echo "Run 'scripts/import-sessions.mjs' anytime to refresh data."
echo ""
