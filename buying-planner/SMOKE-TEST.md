# Buying Planner — Smoke Test Results

**Date:** 2026-10-12
**Environment:** Ubuntu Linux, Python 3.12.14, JDK 21.0.7, Maven 3.9.12

---

## Mock API (port 8900)

| # | Endpoint | Status | Response Summary |
|---|----------|--------|------------------|
| 1 | `GET /api/health` | **PASS** (added) | `{"status":"ok","products":34,"categories":3}` |
| 2 | `GET /api/categories` | **PASS** | Returns 3 categories: washing-machines, laptops, mattresses |
| 3 | `GET /api/categories/laptops/products` | **PASS** | Returns 12 products with merged ratings, pros, cons, sub-scores |
| 4 | `GET /api/categories/laptops/products?sort_by=score&max_price=1500` | **PASS** | Returns 10 products sorted by score (top: Apple MBA M3, score 89) |
| 5 | `GET /api/products/101` | **PASS** | Returns Apple MacBook Air 15" M3 with full rating data |
| 6 | `GET /api/compare?ids=101,103,106` | **PASS** | Returns side-by-side comparison of 3 laptops |
| 7 | `GET /api/products/101/price-history` | **PASS** | Returns 6 monthly price entries |
| 8 | `GET /api/search?q=apple` | **PASS** | Returns 2 hits (MacBook Air, MacBook Pro) |

**Note:** Seed data uses product IDs 1–12 (washing machines), 101–112 (laptops), 201–212 (mattresses). There is no product with ID 13/14/16.

## UI (port 8901)

| Asset | Status | Notes |
|-------|--------|-------|
| `index.html` | **PASS** | Loads correctly, 5 screens with data-step attributes |
| `styles.css` | **PASS** | CR-themed design variables, responsive layout |
| `app.js` | **PASS** | Loads without syntax errors |

### UI → API Integration

| Screen | API Call | Status |
|--------|----------|--------|
| 1 — Category Picker | `GET /api/categories` (on boot) | **PASS** — base URL matches `http://localhost:8900` |
| 2 — Preferences | None (local slider/checkboxes) | **PASS** |
| 3 — Products | `GET /api/categories/{id}/products?max_price=...&sort_by=score` | **PASS** |
| 4 — Compare | `GET /api/compare?ids=...` + `GET /api/products/{id}/price-history` | **PASS** |
| 5 — Buying Plan | Local `generatePlan()` or agent `POST /api/v1/buying-plan` | **PASS** (local path; agent requires OPENAI_API_KEY) |

## Agent (Kotlin / Embabel)

| Check | Status | Notes |
|-------|--------|-------|
| JDK 21 available | **PASS** | OpenJDK 21.0.7 |
| Maven available | **PASS** | Apache Maven 3.9.12 |
| `mvn compile` | **PASS** (after fix) | Compiles cleanly with Embabel 1.5.4-SNAPSHOT |
| Runtime test | **SKIPPED** | Requires `OPENAI_API_KEY` for LLM-backed actions |

## Fixes Applied

1. **Added `/api/health` endpoint** (`mock-api/main.py`)
   - Was missing entirely; returns `{"status":"ok","products":N,"categories":N}`

2. **Fixed `BuyingPlannerController.kt` compilation error**
   - `agentPlatform.runProcess(...)` → `agentPlatform.createAgentProcessFrom(...)` + `process.run()` + `process.resultOfType(...)`
   - Added `ProcessOptions` import
   - `runProcess` does not exist on `AgentPlatform`; the correct API is `createAgentProcessFrom` + `run`

3. **Updated `.gitignore`**
   - Added root `.venv/` and `__pycache__/` patterns

## run-demo.sh

The launcher script is functional. Usage:
```bash
./run-demo.sh              # mock API + UI only
./run-demo.sh --with-agent # also starts the Embabel agent (needs OPENAI_API_KEY)
```
