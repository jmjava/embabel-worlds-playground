# What this playground proves

This repository holds **realms and experiments** for [Embabel Worlds](https://worlds.embabel.com). The headline POC is **Buying Planner** — a synthetic product-ratings catalog, a five-screen browser fixture, a Kotlin GOAP agent, and an install-ready realm spec.

**Canonical test and feature map:** [buying-planner/TEST-AND-DEMONSTRATION.md](buying-planner/TEST-AND-DEMONSTRATION.md)

## Local setup (matches Cloud Environment)

```bash
bash .cursor/install.sh
bash scripts/verify-local.sh
```

Details: [AGENTS.md](AGENTS.md).

## Verified automatically (2026-10-18)

| Suite | Command | Result |
| --- | --- | --- |
| Fixture console (Playwright) | `cd buying-planner && npm test` | **10 / 10** |
| Domain types (Maven) | `cd buying-planner/agent && mvn test` | **6 / 6** |

The Playwright suite is the **fixture console**: UI on port **8901**, mock API on **8900**. No Docker, no Worlds appliance, no LLM key. Ratings in `mock-api/data/seed.json` are synthetic.

## Not exercised without credentials

| Piece | Requirement |
| --- | --- |
| Full GOAP runtime | `OPENAI_API_KEY`, `bash run-demo.sh --with-agent` |
| Worlds appliance + realm link | Embabel account, model key, `~/embabel/worlds` |
| Cypher views / producers at runtime | Linked realm in Neo4j |
| `wireguard/` gateway | AWS CDK deploy |

## Layout

| Path | Role |
| --- | --- |
| [buying-planner/](buying-planner/) | Mock API, UI, agent, realm YAML, Playwright proof |
| [wireguard/](wireguard/) | Optional CDK tunnel so guests reach the Worlds console on this host |
| Root [README.md](README.md) | Official Worlds install script and project index |
