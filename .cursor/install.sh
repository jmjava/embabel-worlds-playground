#!/usr/bin/env bash
# Idempotent dev / Cloud Agent Build install for embabel-worlds-playground.
# Local: bash .cursor/install.sh
# Verify: bash scripts/verify-local.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLANNER="${ROOT}/buying-planner"
AGENT="${PLANNER}/agent"
MOCK_API="${PLANNER}/mock-api"

install_system_deps() {
  if [[ "${PLAYGROUND_INSTALL_SKIP_SYSTEM_DEPS:-}" == "1" ]]; then
    return 0
  fi
  if ! command -v sudo >/dev/null 2>&1; then
    return 0
  fi
  local missing=()
  command -v python3 >/dev/null 2>&1 || missing+=(python3)
  python3 -c "import venv" 2>/dev/null || missing+=(python3-venv)
  command -v java >/dev/null 2>&1 || missing+=(openjdk-21-jdk)
  command -v mvn >/dev/null 2>&1 || missing+=(maven)
  command -v node >/dev/null 2>&1 || missing+=(nodejs)
  if ((${#missing[@]} == 0)); then
    return 0
  fi
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
    python3 python3-venv python3-pip \
    openjdk-21-jdk maven \
    nodejs npm
}

echo "▸ embabel-worlds-playground install (root=${ROOT})"
install_system_deps

echo "▸ mock-api Python venv"
cd "${MOCK_API}"
if [[ ! -x .venv/bin/uvicorn ]]; then
  python3 -m venv .venv
  .venv/bin/pip install --disable-pip-version-check -r requirements.txt
fi

echo "▸ Playwright npm deps"
cd "${PLANNER}"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi
if [[ "${CI:-}" == "true" || "${PLAYGROUND_INSTALL_CHROMIUM:-}" == "1" ]]; then
  npx playwright install chromium
fi

echo "▸ Maven agent (resolve + unit tests)"
cd "${AGENT}"
mvn -B -q test

echo "✓ Install complete. Run: bash scripts/verify-local.sh"
