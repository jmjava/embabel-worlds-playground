#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

API_PID=""
HTTP_PID=""
AGENT_PID=""
WITH_AGENT=false

# Parse flags
for arg in "$@"; do
  case "$arg" in
    --with-agent) WITH_AGENT=true ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

cleanup() {
  echo ""
  echo "Shutting down…"
  [ -n "$HTTP_PID" ]  && kill "$HTTP_PID"  2>/dev/null || true
  [ -n "$API_PID" ]   && kill "$API_PID"   2>/dev/null || true
  [ -n "$AGENT_PID" ] && kill "$AGENT_PID" 2>/dev/null || true
  exit 0
}
trap cleanup EXIT INT TERM

echo "=== CR Buying Planner — Demo ==="
echo ""

# ── 1) Start mock API ────────────────────────────────────────────
echo "▸ Starting Mock API on http://localhost:8900 …"
cd "$SCRIPT_DIR/mock-api"
if [ -d ".venv" ]; then
  source .venv/bin/activate
fi
uvicorn main:app --host 0.0.0.0 --port 8900 &
API_PID=$!
cd "$SCRIPT_DIR"

echo "  Waiting for API…"
sleep 2

# ── 2) Optionally start the Embabel agent ────────────────────────
if [ "$WITH_AGENT" = true ]; then
  if [ -z "${OPENAI_API_KEY:-}" ]; then
    echo ""
    echo "⚠  --with-agent requires OPENAI_API_KEY to be set."
    echo "   export OPENAI_API_KEY=sk-..."
    echo "   Skipping agent start."
    echo ""
  else
    echo "▸ Building and starting Agent on http://localhost:8080 …"
    echo "  (This may take a minute on first build)"
    cd "$SCRIPT_DIR/agent"
    mvn -q spring-boot:run &
    AGENT_PID=$!
    cd "$SCRIPT_DIR"
  fi
fi

# ── 3) Serve the UI ──────────────────────────────────────────────
UI_PORT=8901
echo "▸ Serving UI on http://localhost:$UI_PORT …"
cd "$SCRIPT_DIR/ui"
python3 -m http.server "$UI_PORT" --bind 127.0.0.1 &
HTTP_PID=$!
cd "$SCRIPT_DIR"

sleep 1

# ── 4) Open in browser (best-effort) ─────────────────────────────
URL="http://localhost:$UI_PORT"
if command -v xdg-open &>/dev/null; then
  xdg-open "$URL" 2>/dev/null || true
elif command -v open &>/dev/null; then
  open "$URL" 2>/dev/null || true
fi

echo ""
echo "════════════════════════════════════════════════"
echo "  UI:    $URL"
echo "  API:   http://localhost:8900/docs"
if [ -n "$AGENT_PID" ]; then
  echo "  Agent: http://localhost:8080  (AI-powered plans)"
  echo ""
  echo "  ✓ Toggle 'Use AI Agent' in the UI header to switch"
  echo "    between local ranking and agent-generated plans."
else
  echo "  Agent: not started (run with --with-agent)"
fi
echo ""
echo "  Press Ctrl+C to stop all servers."
echo "════════════════════════════════════════════════"

# Keep running until interrupted
wait
