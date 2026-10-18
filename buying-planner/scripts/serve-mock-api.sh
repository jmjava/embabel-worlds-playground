#!/usr/bin/env bash
# Start the synthetic ratings API used by the fixture console and Playwright.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/mock-api"
if [ ! -x .venv/bin/uvicorn ]; then
  python3 -m venv .venv
  .venv/bin/pip install --disable-pip-version-check -r requirements.txt
fi
exec .venv/bin/uvicorn main:app --host 127.0.0.1 --port 8900
