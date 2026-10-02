#!/bin/bash
cd "$(dirname "$0")" || exit 1

PY=""
for c in python3.13 python3.12 python3.11 python3.10 python3; do
  if command -v "$c" >/dev/null 2>&1 && "$c" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' 2>/dev/null; then
    PY="$c"
    break
  fi
done
if [ -z "$PY" ]; then
  echo "Python 3.10 or newer is not installed."
  echo "Install it from the page that is opening now, then double-click start-mac.command again."
  open "https://www.python.org/downloads/"
  read -r -p "Press Enter to close."
  exit 1
fi

if [ ! -x .venv/bin/python ]; then
  echo "First run: setting up, this takes a minute..."
  "$PY" -m venv .venv || { read -r -p "Setup failed. Press Enter to close."; exit 1; }
fi
.venv/bin/python -m pip install --disable-pip-version-check -q -r requirements.txt || { read -r -p "Install failed. Press Enter to close."; exit 1; }

echo
echo "PM Job Finder is running at http://localhost:8000"
echo "Keep this window open while you use it. Close it to stop the app."
echo
(sleep 3 && open "http://localhost:8000") &
exec .venv/bin/python -m uvicorn app.main:app --port 8000
