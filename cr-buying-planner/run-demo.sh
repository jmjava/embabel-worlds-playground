#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

API_PID=""
HTTP_PID=""

cleanup() {
  echo ""
  echo "Shutting down…"
  [ -n "$HTTP_PID" ] && kill "$HTTP_PID" 2>/dev/null || true
  [ -n "$API_PID" ]  && kill "$API_PID"  2>/dev/null || true
  exit 0
}
trap cleanup EXIT INT TERM

echo "=== CR Buying Planner — Demo ==="
echo ""

# 1) Start mock API in the background
echo "▸ Starting Mock API on http://localhost:8900 …"
cd "$SCRIPT_DIR/mock-api"
if [ -d ".venv" ]; then
  source .venv/bin/activate
fi
uvicorn main:app --host 0.0.0.0 --port 8900 &
API_PID=$!
cd "$SCRIPT_DIR"

# 2) Wait for API to be ready
echo "  Waiting for API…"
sleep 2

# 3) Serve the UI
UI_PORT=8901
echo "▸ Serving UI on http://localhost:$UI_PORT …"
cd "$SCRIPT_DIR/ui"
python3 -m http.server "$UI_PORT" --bind 127.0.0.1 &
HTTP_PID=$!
cd "$SCRIPT_DIR"

sleep 1

# 4) Open in browser (best-effort)
URL="http://localhost:$UI_PORT"
if command -v xdg-open &>/dev/null; then
  xdg-open "$URL" 2>/dev/null || true
elif command -v open &>/dev/null; then
  open "$URL" 2>/dev/null || true
fi

echo ""
echo "════════════════════════════════════════════════"
echo "  UI:  $URL"
echo "  API: http://localhost:8900/docs"
echo ""
echo "  Press Ctrl+C to stop both servers."
echo "════════════════════════════════════════════════"

# Keep running until interrupted
wait
