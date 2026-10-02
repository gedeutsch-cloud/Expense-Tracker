#!/bin/bash
# Double-click to launch StatPulse AI on macOS.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Download the LTS installer from https://nodejs.org, run it, then double-click this file again."
  open "https://nodejs.org/en/download"
  read -r -p "Press Enter to close..."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "First run: installing dependencies (one-time, about a minute)..."
  npm ci || { read -r -p "Install failed. Press Enter to close..."; exit 1; }
fi

if [ ! -f .next/BUILD_ID ]; then
  echo "Building StatPulse AI..."
  npm run build || { read -r -p "Build failed. Press Enter to close..."; exit 1; }
fi

(sleep 3 && open "http://localhost:3000") &
echo "StatPulse AI is running at http://localhost:3000 - close this window to stop it."
npm run start
