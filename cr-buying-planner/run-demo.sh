#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== CR Buying Planner — Mock API ==="
echo "Starting FastAPI on http://localhost:8900 ..."
cd "$SCRIPT_DIR/mock-api"
uvicorn main:app --host 0.0.0.0 --port 8900 --reload
