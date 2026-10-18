#!/usr/bin/env bash
set -euo pipefail
#
# Server and client keys for the Worlds gateway. Private keys stay in keys/.
#
# Usage: ./scripts/generate-keys.sh

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
KEYS="$SCRIPT_DIR/keys"

if ! command -v wg >/dev/null 2>&1; then
  echo "ERROR: 'wg' not found. Install wireguard-tools first."
  exit 1
fi

mkdir -p "$KEYS"

if [[ -f "$KEYS/server-private.key" ]]; then
  echo "Server keys already exist — skipping."
else
  wg genkey | tee "$KEYS/server-private.key" | wg pubkey > "$KEYS/server-public.key"
  chmod 600 "$KEYS/server-private.key"
fi

if [[ -f "$KEYS/client-private.key" ]]; then
  echo "Client keys already exist — skipping."
else
  wg genkey | tee "$KEYS/client-private.key" | wg pubkey > "$KEYS/client-public.key"
  chmod 600 "$KEYS/client-private.key"
fi

if [[ -f "$SCRIPT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/.env"
  set +a
fi
ENDPOINT="${WIREGUARD_ENDPOINT:-<ELASTIC_IP>:51820}"

cat > "$KEYS/wg0-client.conf" <<EOF
[Interface]
Address = 10.10.0.2/24
PrivateKey = $(cat "$KEYS/client-private.key")

[Peer]
PublicKey = $(cat "$KEYS/server-public.key")
Endpoint = ${ENDPOINT}
AllowedIPs = 10.10.0.0/24
PersistentKeepalive = 25
EOF
chmod 600 "$KEYS/wg0-client.conf"

echo "Keys are in wireguard/keys/ (gitignored)."
echo "After deploy, set WIREGUARD_ENDPOINT in .env to the ElasticIP:51820 output and run this again."
