# Test Results & Embabel Worlds Demonstration

**Last run:** 2026-10-18  
**Environment:** Ubuntu Linux, Python 3.12, OpenJDK 21.0.12, Maven 3.8.7, Google Chrome 154, Node/npm (Playwright 1.64)

This document summarizes automated test outcomes for the **CR Buying Planner** POC and maps what each layer demonstrates about **Embabel Agents** and **Embabel Worlds**.

---

## Test summary

| Suite | Command | Result |
|-------|---------|--------|
| Playwright E2E (fixture console) | `cd cr-buying-planner && npm test` | **10 / 10 passed** (~11 s) |
| Kotlin unit tests (domain types) | `cd cr-buying-planner/agent && mvn test` | **6 / 6 passed** |
| Agent compile | `mvn compile` | **SUCCESS** |
| Mock API smoke (curl) | 7 GET endpoints on `:8900` | **All HTTP 200** |

Full Maven log: see repo CI or local `mvn test` output. Playwright starts the mock API and UI automatically via `playwright.config.ts`.

### Not run in this pass (requires credentials / appliance)

| Check | Why skipped |
|-------|-------------|
| Full GOAP agent runtime (`parseIntent` → `searchProducts` → `compareTopCandidates`) | Needs `OPENAI_API_KEY` and running agent (`run-demo.sh --with-agent`) |
| Embabel Worlds appliance (`embabel up`, console at `:4343`) | Interactive account + API key setup; Docker appliance |
| Realm registration (`embabel realms link …`) | Depends on appliance |
| Neo4j graph ingestion, Cypher views, producers at runtime | Realm is a **spec artifact** until linked to Worlds |

---

## Playwright: what the fixture console demonstrates

The **fixture console** is the five-screen UI (`ui/` on **8901**) backed by the synthetic **mock CR API** (`mock-api/` on **8900**). Tests prove the demo works **without** Docker, the Worlds appliance, or an LLM key.

| Test | Behavior demonstrated |
|------|------------------------|
| `fixture API serves the synthetic catalog` | Health endpoint: 34 products, 3 categories |
| `category picker lists the three fixture categories` | Washing Machines, Laptops, Mattresses (+ rating-factor hints) |
| `laptop flow ranks fixture products into a buying plan` | End-to-end: category → preferences → product grid → expand details → compare 3 SKUs → sparkline price history → **local** top pick / runner-up / budget pick + comparison & timing sections |
| `a tight budget keeps only products inside the cap` | `max_price` filtering ($700 laptop cap) |
| `a zero budget shows the empty catalog state` | Empty-state UX when no products match |
| `compare starts at two products and stops at three` | Compare bar rules (min 2, max 3 selections) |
| `price sort puts the cheapest fixture laptop first` | Client-side sort (`price-asc` vs default score sort) |
| `back and start over return to earlier steps` | Back button, breadcrumb navigation, Start Over resets compare state |
| `the AI toggle falls back to local ranking when the agent is down` | **Use AI Agent** toggle + graceful fallback toast when `:8080` agent is absent |
| `the category screen explains a missing fixture API` | Error messaging when API unreachable |

Together, these tests document a **Consumer Reports–style buying journey** on synthetic data: catalog browse, preference capture, rated products, side-by-side compare with price trends, and a deterministic buying plan.

---

## Maven unit tests: what they demonstrate

`BuyingPlannerAgentTest` exercises **JSON serialization** for the agent’s domain model (`BuyingIntent`, `ProductCandidate`, `ProductCandidateList`, `BuyingPlan`). They intentionally **do not** boot Spring or call the LLM (see test class comment).

This validates the **data contract** between the UI, REST controller, and GOAP chain — the same shapes the Worlds realm would persist as user anchors (`BuyingIntent`, `BuyingPlan`).

---

## Mock API smoke: endpoints verified

| Endpoint | Verified |
|----------|----------|
| `GET /api/health` | Product/category counts |
| `GET /api/categories` | 3 categories |
| `GET /api/categories/laptops/products?sort_by=score&max_price=1500` | Filtered, sorted list |
| `GET /api/products/101` | Single product + rating |
| `GET /api/compare?ids=101,103,106` | Side-by-side compare |
| `GET /api/products/101/price-history` | Historical prices |
| `GET /api/search?q=apple` | Keyword search |

These endpoints mirror the operations declared in `realm/apis/cr-mock-api.yml` for Worlds API ingestion.

---

## Embabel Agent features illustrated (code + partial runtime)

Implemented in `agent/` and exercised **at compile time** + **UI fallback path** in Playwright:

| Feature | Where / how |
|---------|-------------|
| **`@Agent` GOAP agent** | `BuyingPlannerAgent` — 3-step chain driven by type compatibility |
| **`@Action` steps** | `parseIntent`, `searchProducts`, `compareTopCandidates` |
| **`@AchievesGoal` + `@Export(remote = true)`** | Goal exported as remote service `buyingPlan` |
| **Structured LLM I/O** | `context.ai().withDefaultLlm().createObject(...)` |
| **Tool/API integration** | `CrApiClient` calls mock CR REST API |
| **Spring REST invocation** | `AgentPlatform.createAgentProcessFrom()` → `run()` → `resultOfType(BuyingPlan::class.java)` on `POST /api/v1/buying-plan` |
| **OpenAI starter + MCP server starter** | `pom.xml` dependencies (Embabel 1.5.4-SNAPSHOT) |

**Runtime LLM path:** enable with `OPENAI_API_KEY` and `bash run-demo.sh --with-agent`, then toggle **Use AI Agent** in the UI (not covered by current automated tests).

---

## Embabel Worlds features illustrated (realm spec — design-time)

The `realm/` tree is a **complete, install-ready** realm for **`realm-consumer-reports`**. Automated tests do **not** load it into the appliance; it illustrates Worlds **authoring model** and intended runtime behavior after `embabel realms link`.

### Realm manifest (`realm/realm.yml`)

- Named realm with version, author, category, tags, description  
- Exports: **types**, **apis**, **views** (standard Worlds packaging)

### Domain graph (`realm/types/product-types.yml`)

| Worlds concept | Illustration |
|--------------|--------------|
| **Typed nodes** | Category, Product, Rating, SubScore, PriceEntry, BuyingIntent, BuyingPlan |
| **Graph relations** | `IN_CATEGORY`, `RATES`, `PART_OF`, `PRICE_FOR`, `PLAN_FOR`, `TOP_PICK` / `RUNNER_UP` / `BUDGET_PICK` |
| **User anchors** | `BuyingIntent` and `BuyingPlan` marked `userAnchor: true` (per-user, per-session) |

The fixture UI and mock API populate the same conceptual model the graph would hold after ingestion.

### External API binding (`realm/apis/cr-mock-api.yml`)

| Worlds concept | Illustration |
|--------------|--------------|
| **API declaration** | `cr-ratings` → `http://localhost:8900`, OpenAPI-style, no auth |
| **Operation catalog** | listCategories, listProductsInCategory, getProduct, getProductPriceHistory, compareProducts, searchProducts |

Maps 1:1 to the FastAPI routes proven by Playwright and curl.

### Console views (`realm/views/buying-views.yml`)

| Worlds concept | Illustration |
|--------------|--------------|
| **Parameterized Cypher views** | top-rated-by-category, budget-picks, price-trend, compare-products, user-buying-history |
| **LLM-assisted exploration** | `ai.hint` on `user-buying-history` for Worlds console queries |

These mirror queries the fixture UI performs client-side; in Worlds they run against Neo4j.

### Producers (`realm/producers/product-producers.yml`)

| Worlds concept | Illustration |
|--------------|--------------|
| **Generative producer** | `price-trend-summary` — LLM prompt template → `HAS_TREND_SUMMARY` edge on `Product` |
| **Remote producer** | `similar-products` — calls `cr-ratings.searchProducts`, maps input, creates `SIMILAR_TO` edges |

---

## Repository-level Worlds playground features

From the root `README.md` and project layout:

| Feature | Status in this repo |
|---------|---------------------|
| **Official Worlds install script** | Documented (`~/embabel/worlds`, console `:4343`) |
| **Realm checkout linked into appliance** | Documented workflow; not executed in CI |
| **WireGuard CDK gateway** | Separate `wireguard/` recipe for remote console access (not part of CR POC tests) |
| **Standalone vs appliance** | POC runs fully standalone; realm adds graph persistence, cross-realm queries, and console views when linked |

---

## How to re-run everything

```bash
cd cr-buying-planner
npm install
npm test

cd agent
mvn test
mvn compile
```

Optional: `bash run-demo.sh` (API + UI) or `bash run-demo.sh --with-agent` (adds LLM agent on `:8080`).

---

## Coverage gap checklist (future automation)

- [ ] Integration test profile for GOAP chain with mock LLM or recorded fixtures  
- [ ] Contract test: OpenAPI spec ↔ `realm/apis/cr-mock-api.yml` operations  
- [ ] Worlds appliance smoke after non-interactive setup (realm link + view query)  
- [ ] Playwright path with agent running and AI toggle **on** (requires secret in CI)
