# CR Buying Planner POC

An end-to-end proof-of-concept that uses **Embabel** agents and a **Consumer Reports–style mock API** to guide a user through picking the best product in a category. The POC demonstrates a 3-step GOAP agent flow, a five-screen browser UI, and a ready-to-install Worlds realm spec.

> **Note:** All product ratings, scores, verdicts, pros/cons, and price histories in `mock-api/data/seed.json` are **synthetic**. They are not sourced from Consumer Reports and do not represent actual CR evaluations.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CR Buying Planner POC                    │
├─────────────────────────────────────────────────────────────┤
│  Browser UI (vanilla JS)                        :8901       │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌───────┐ ┌──────┐  │
│  │ Category │→│ Budget & │→│ Rated  │→│Compare│→│ Plan │  │
│  │ Picker   │ │ Priority │ │Products│ │       │ │      │  │
│  └──────────┘ └──────────┘ └────────┘ └───────┘ └──────┘  │
├─────────────────────────────────────────────────────────────┤
│  BuyingPlannerAgent (Kotlin / Embabel)          :8080       │
│  parseIntent → searchProducts → compareTopCandidates        │
├─────────────────────────────────────────────────────────────┤
│  Mock CR API (FastAPI)                          :8900       │
│  34 products · 3 categories · 6 endpoints                   │
├─────────────────────────────────────────────────────────────┤
│  Worlds Realm (realm-consumer-reports)          future       │
│  types + apis + views + producers → appliance install       │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

**Prerequisites:** Python 3.10+, pip

```bash
# From the repo root:
cd cr-buying-planner

# Install Python deps (one-time)
cd mock-api && python3 -m venv .venv && source .venv/bin/activate
pip install fastapi uvicorn pyyaml
cd ..

# Run the demo
bash run-demo.sh
```

This starts the mock API on **http://localhost:8900** (Swagger docs at `/docs`) and serves the click-through UI on **http://localhost:8901**.

## Components

| Directory | Description |
|-----------|-------------|
| `mock-api/` | FastAPI server with 34 synthetic products, 3 categories, and 6 REST endpoints. Data lives in `data/seed.json`. |
| `agent/` | Kotlin/Embabel `BuyingPlannerAgent` with a 3-step GOAP flow. Built with Maven (`pom.xml`). |
| `ui/` | Five-screen vanilla-JS browser demo: Category Picker → Budget & Priority → Rated Products → Compare → Plan. |
| `realm/` | Embabel Worlds realm spec (`realm.yml`, types, apis, views, producers). Ready to install when the appliance is available. |
| `run-demo.sh` | One-command launcher: starts the mock API and serves the UI. |

## Mock API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/categories` | GET | List all product categories |
| `/api/categories/{category_id}/products` | GET | List products in a category (filters: `max_price`, `min_score`, `sort_by`) |
| `/api/products/{product_id}` | GET | Get a single product with its full rating |
| `/api/products/{product_id}/price-history` | GET | Get price history entries for a product |
| `/api/compare?ids=1,2,3` | GET | Side-by-side comparison of multiple products |
| `/api/search?q=quiet` | GET | Keyword search across names, brands, pros, cons, and verdicts |

## Agent Architecture

The `BuyingPlannerAgent` implements a 3-step **GOAP** (Goal-Oriented Action Planning) flow using Embabel's `@Action` and `@AchievesGoal` annotations:

1. **`parseIntent`** — Takes raw `UserInput` and uses the LLM to extract a structured `BuyingIntent` (category, budget, priorities, requirements).
2. **`searchProducts`** — Fetches products from the mock API, then asks the LLM to score and rank them against the user's priorities, producing a `ProductCandidateList`.
3. **`compareTopCandidates`** — Gathers full details, price histories, and comparison data for the top candidates, then generates a complete `BuyingPlan` with top pick, runner-up, budget pick, reasoning, comparison summary, and timing advice.

The goal is exported as a remote service (`buyingPlan`) that accepts `UserInput` and produces a `BuyingPlan`.

## Worlds Realm

The `realm/` directory contains the complete realm spec for **`realm-consumer-reports`**, ready to install when the Embabel Worlds appliance is available:

- **`realm.yml`** — Manifest declaring the realm name, version, author, and exports.
- **`types/product-types.yml`** — Eight domain types and their relationships (see Data Model below).
- **`apis/cr-mock-api.yml`** — Declares the mock API connection and its six operations.
- **`views/buying-views.yml`** — Five Cypher-backed views for common queries (top-rated, budget picks, price trends, comparisons, buying history).
- **`producers/product-producers.yml`** — Two producers: a generative price-trend summarizer and a remote similar-products finder.

## Data Model

The realm defines **8 types** connected by graph relationships:

| Type | Description | Key Relations |
|------|-------------|---------------|
| **Category** | Product category with rating priorities (e.g. washing-machines) | — |
| **Product** | A product with pricing and brand info | `IN_CATEGORY` → Category |
| **Rating** | Overall CR rating (0–100) with pros, cons, verdict | `RATES` → Product |
| **SubScore** | A sub-dimension score (e.g. reliability: 85) | `PART_OF` → Rating |
| **PriceEntry** | A historical price point with date and retailer | `PRICE_FOR` → Product |
| **BuyingIntent** | User's buying intent per session (user anchor) | — |
| **BuyingPlan** | Generated plan with recommendations (user anchor) | `PLAN_FOR` → BuyingIntent, `TOP_PICK` / `RUNNER_UP` / `BUDGET_PICK` → Product |

`BuyingIntent` and `BuyingPlan` are **user anchors** — they are created per-user, per-session.

## Next Steps

- **Install Worlds appliance** and register `realm-consumer-reports` with `worlds install realm/`
- **Register the realm** to get types, views, and producers live in the knowledge graph
- **Cross-realm queries** — combine CR ratings with other realms (e.g. warranty data, retailer inventory)
- **Add more categories** — extend `seed.json` with TVs, refrigerators, headphones, etc.
- **Real CR API integration** — swap the mock API for an authenticated Consumer Reports data feed
- **Agent UI integration** — connect the browser UI to the live Embabel agent instead of static click-through
- **Price alert producer** — add a producer that monitors price drops and notifies users
