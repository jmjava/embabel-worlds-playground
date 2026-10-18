# What this playground proves

Recorded 2026-10-18 after `npm test` in `cr-buying-planner` on a Cloud Agent VM with Python 3.12, Node 22, and Google Chrome.

The Playwright suite is the fixture console: the browser UI on port 8901, backed by the synthetic catalog API on port 8900. It walks the shopping flow with no Worlds appliance, no Docker, and no LLM key. All ratings in `mock-api/data/seed.json` are synthetic.

## Proven by the fixture tests

`npm test` ran 10 tests, 10 passed, about 10.5 seconds.

| Check | Result |
| --- | --- |
| Catalog health | `GET /api/health` returns `status: ok`, 34 products, 3 categories |
| Category picker | Washing Machines, Laptops, and Mattresses render. Laptops shows 5 rating factors |
| Laptop buying plan | Default budget $2,500. Top pick MacBook Pro 14" M3 Pro (score 92, $1,999). Runner-up MacBook Air 15" M3. Budget pick Zenbook 14 OLED ($899). Comparison summary and timing advice are present. Three price sparklines render |
| Tight budget | A $700 laptop cap leaves only IdeaPad Slim 5 16 |
| Empty catalog | A $0 washing-machine budget shows “No products match your filters” |
| Compare limits | Compare stays hidden at one product, opens at two, and refuses a fourth |
| Sort | Score order leads with the MacBook Pro. Price ascending leads with IdeaPad Slim 5 16 at $649 |
| Navigation | Back and Start Over return to earlier steps and clear compare selections |
| Agent toggle | With the agent down, “Use AI Agent” toasts “Agent unavailable, using local ranking” and still produces a local plan |
| Missing API | Aborting the catalog request shows “Could not load categories” and no category cards |

A manual pass of the same laptop path in Chrome produced the same top pick, runner-up, and budget pick.

## What the fixture does not exercise

These pieces are in the repository and are the Embabel Worlds surface. This run did not execute them.

| Piece | Why it stayed idle |
| --- | --- |
| `BuyingPlannerAgent` GOAP chain | Needs JDK, Maven, and `OPENAI_API_KEY`. The UI falls back to local ranking when `:8080` is down |
| Worlds appliance (`embabel up`, console `:4343`) | Needs an Embabel account and a model key. Docker is installed in this environment so the appliance can be unpacked later |
| Realm install (`embabel realms link`) | The YAML is complete. Nothing ingested it into Neo4j |
| Cypher views and producers | They run inside the appliance graph, which was not started |
| `wireguard/` gateway | AWS CDK deploy. It publishes a console that stays on this machine. It is not part of the fixture |

## Embabel Worlds features the playground explores

The playground is a local realm and a fixture that mirrors it. Worlds itself is the appliance in `~/embabel/worlds`: a knowledge graph, declared APIs, console views, and producers. This repo does not install Worlds. It points a realm at that install.

### Realm package

`cr-buying-planner/realm/realm.yml` is `realm-consumer-reports` 0.1.0, category `shopping`. It exports types, APIs, and views. The intended install is `embabel realms link` on a checkout of this planner, then `embabel open` for `http://localhost:4343`.

### Knowledge-graph types

`realm/types/product-types.yml` defines seven types and the edges between them.

| Type | Role | Edges |
| --- | --- | --- |
| Category | Rating priorities for a kind of product | — |
| Product | Brand, price, model | `IN_CATEGORY` → Category |
| Rating | Overall score, pros, cons, verdict | `RATES` → Product |
| SubScore | One dimension, such as reliability | `PART_OF` → Rating |
| PriceEntry | Dated retailer price | `PRICE_FOR` → Product |
| BuyingIntent | Session intent: category, budget, priorities | User anchor |
| BuyingPlan | Top pick, runner-up, budget pick, reasoning | `PLAN_FOR` → BuyingIntent; `TOP_PICK`, `RUNNER_UP`, `BUDGET_PICK` → Product. User anchor |

User anchors are per person and per session. Category, product, rating, and price data are shared catalog facts.

### Declared API

`realm/apis/cr-mock-api.yml` names the `cr-ratings` connection: OpenAPI shape, no auth, base URL `http://localhost:8900`. Operations: `listCategories`, `listProductsInCategory`, `getProduct`, `getProductPriceHistory`, `compareProducts`, `searchProducts`. The FastAPI server in `mock-api/` is the stand-in. The comment in that file says a real Consumer Reports feed replaces the URL.

### Console views

`realm/views/buying-views.yml` is Cypher the Worlds console can run:

- `top-rated-by-category` — highest overall scores in a category
- `budget-picks` — score-per-dollar under a price cap
- `price-trend` — dated prices for one product
- `compare-products` — scores, verdicts, and sub-scores for a set of ids
- `user-buying-history` — past plans for the user, with an `ai.hint` for LLM-assisted exploration

### Producers

`realm/producers/product-producers.yml` adds derived edges:

- `price-trend-summary` is generative. An LLM writes one sentence from the price history and stores it on `HAS_TREND_SUMMARY`.
- `similar-products` is remote. It calls `cr-ratings.searchProducts` and stores `SIMILAR_TO`.

### GOAP agent as a remote goal

`BuyingPlannerAgent` is an Embabel `@Agent`. The platform wires the chain from input and output types:

`UserInput` → `parseIntent` → `BuyingIntent` → `searchProducts` → `ProductCandidateList` → `compareTopCandidates` → `BuyingPlan`

Each step asks the default LLM for a structured object and reads the mock API through `CrApiClient`. `compareTopCandidates` carries `@AchievesGoal` with `Export(remote = true, name = "buyingPlan")`, so the chain is a remote service. `POST /api/v1/buying-plan` on port 8080 accepts `{ "content": "..." }` and returns the plan. The fixture toggle calls that endpoint and uses the local ranker when it is unreachable.

### Sharing the console

`wireguard/` is a CDK gateway in the shape of a home-lab tunnel: a public `t3.micro`, an Elastic IP, Nginx, and WireGuard. Worlds stays on this machine, listening on `127.0.0.1:11044` (console) and `127.0.0.1:11043` (API and MCP). Guests open the console hostname. The graph, documents, and realm credentials stay local.
