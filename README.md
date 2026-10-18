# embabel-worlds-playground

A local playground for [Embabel Worlds](https://worlds.embabel.com).

The appliance itself is installed by the official script into `~/embabel/worlds`. This repository is the place for realms, recipes, and experiments that point at that install.

## Install Worlds

Read the script first, then run it:

```bash
curl -fsSL https://worlds.embabel.com/install.sh
curl -fsSL https://worlds.embabel.com/install.sh | EMBABEL_MODE=worlds sh
```

That checks Docker, unpacks `embabel-worlds/appliance` into `~/embabel/worlds`, and hands off to `./worlds.py`. The console is `http://localhost:4343`. Setup asks for an account and your own Anthropic or OpenAI key. Nothing is installed globally.

Undo: `docker compose down -v` inside `~/embabel/worlds`, then delete that directory.

## Let someone else open the console

`wireguard/` is a CDK gateway in the same shape as the home-lab tunnel: a public `t3.micro` and Elastic IP, Nginx, and WireGuard. Worlds stays on this machine. Guests use the console hostname. See [wireguard/README.md](wireguard/README.md).

## Projects

### Buying Planner

A proof-of-concept demonstrating a 3-step GOAP agent that recommends products from a synthetic ratings catalog. Includes a FastAPI mock API (34 synthetic products), a Kotlin/Embabel agent, a five-screen browser UI, and a complete Worlds realm spec.

See [buying-planner/README.md](buying-planner/README.md) for quick start and architecture details.

**Proof and feature map:** [PLAYGROUND.md](PLAYGROUND.md) · [buying-planner/TEST-AND-DEMONSTRATION.md](buying-planner/TEST-AND-DEMONSTRATION.md)

**Local dev (same as Cursor Cloud Environment):** `bash .cursor/install.sh` then `bash scripts/verify-local.sh` — see [AGENTS.md](AGENTS.md).
