# Embabel Worlds gateway

A CDK WireGuard gateway for a Worlds appliance that stays on this machine. It follows the home-lab tunnel in [google-oauth-poc `wireguard`](https://github.com/jmjava/google-oauth-poc/tree/main/wireguard): a public `t3.micro` and Elastic IP, Nginx, and WireGuard, with no NAT gateway.

Guests open the console hostname. Nginx sends that traffic through the tunnel to this machine. Worlds itself keeps listening on `127.0.0.1:11044` (console) and `127.0.0.1:11043` (API and MCP). `scripts/forward-worlds.sh` accepts the tunnel on `10.10.0.2` and forwards those two ports. Neo4j and Grafana are not published.

The graph, documents, and realm credentials stay on this machine. Guests need an account on the appliance.

## Cost

A `t3.micro` plus an Elastic IP while the instance is running. Stop it when nobody is connecting. `cdk destroy` releases the address.

## Deploy

Requires Node 18, AWS credentials, `cdk bootstrap` once in the account, and `wireguard-tools` (`wg`).

```bash
cd wireguard
cp .env.example .env
# Set CONSOLE_HOSTNAME. Set HOSTED_ZONE_* to create the DNS records.
./scripts/generate-keys.sh
npm install
npm run build
npx cdk deploy
```

Copy `WireGuardEndpoint` into `.env` as `WIREGUARD_ENDPOINT`, run `./scripts/generate-keys.sh` again, then on this machine:

```bash
sudo install -m 600 keys/wg0-client.conf /etc/wireguard/wg0.conf
sudo wg-quick up wg0
./scripts/forward-worlds.sh
```

DNS must point the console hostname at the Elastic IP before TLS will issue. After that:

```bash
# on the instance, via SSM
sudo certbot --nginx -d "$CONSOLE_HOSTNAME"
```

Then set these in `~/embabel/worlds/.env` and restart Worlds, using the public names:

```
WORLDS_CONSOLE_PUBLIC_URL=https://CONSOLE_HOSTNAME
WORLDS_PUBLIC_BASE_URL=https://API_HOSTNAME
```

Leave `API_HOSTNAME` unset when guests only need the console. Set it when a coding agent should reach MCP through the same gateway.

## What this does not do

It does not install Worlds. That is still the installer from [worlds.embabel.com](https://worlds.embabel.com). It does not publish a realm git repo; someone who should run the realm on their own appliance installs the repo, and no tunnel is involved.
