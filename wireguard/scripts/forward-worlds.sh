#!/usr/bin/env bash
set -euo pipefail
#
# Worlds publishes the console and API on 127.0.0.1 only. The gateway reaches
# this machine on its WireGuard address, so this listens there and forwards home.
#
# Usage: ./scripts/forward-worlds.sh
# Stop with Ctrl-C.

VPN_IP="${WORLDS_VPN_IP:-10.10.0.2}"

if ! command -v socat >/dev/null 2>&1; then
  echo "ERROR: socat is not installed."
  exit 1
fi

for _ in $(seq 1 30); do
  if ip -4 addr show | grep -q "${VPN_IP}/"; then
    break
  fi
  sleep 1
done
if ! ip -4 addr show | grep -q "${VPN_IP}/"; then
  echo "ERROR: ${VPN_IP} is not on an interface. Bring the tunnel up first."
  exit 1
fi

pids=()
cleanup() {
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

forward() {
  local listen_port="$1"
  local target_port="$2"
  socat "TCP-LISTEN:${listen_port},bind=${VPN_IP},fork,reuseaddr" "TCP:127.0.0.1:${target_port}" &
  pids+=("$!")
  echo " ${VPN_IP}:${listen_port} -> 127.0.0.1:${target_port}"
}

echo "Forwarding Worlds through the tunnel:"
forward 11044 11044
forward 11043 11043
wait
