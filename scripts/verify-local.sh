#!/usr/bin/env bash
# Same automated proof as Cloud Agent / CI (fixture console + domain types).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLANNER="${ROOT}/buying-planner"

echo "=== Playwright fixture console ==="
cd "${PLANNER}"
npm test

echo ""
echo "=== Maven domain type tests ==="
cd "${PLANNER}/agent"
mvn -q test

echo ""
echo "✓ verify-local: all green"
