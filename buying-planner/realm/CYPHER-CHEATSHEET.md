# Cypher cheat sheet — Buying Planner realm

**Cypher** (not “cipher”) is the graph query language Embabel Worlds runs against Neo4j when you define **views** in YAML. Each view in `views/*.yml` supplies a `cypher:` block and optional `parameters:` that become `$parameterName` in the query.

Use this sheet when authoring or extending views for **`realm-buying-planner`**, or when experimenting in the Worlds console after `embabel realms link`.

---

## Graph schema (this realm)

```text
(Category) ←[:IN_CATEGORY]— (Product) —[:RATES]→ (Rating) ←[:PART_OF]— (SubScore)
                                ↑
                          [:PRICE_FOR]
                                |
                          (PriceEntry)

(BuyingIntent) ←[:PLAN_FOR]— (BuyingPlan) —[:TOP_PICK|RUNNER_UP|BUDGET_PICK]→ (Product)

Producer edges (after producers run):
  (Product) —[:HAS_TREND_SUMMARY]→ (text summary node or property, appliance-specific)
  (Product) —[:SIMILAR_TO]→ (Product)
```

| Label | Key properties | Typical relationships |
|-------|----------------|------------------------|
| `Category` | `id`, `name`, `priorities[]` | ← `IN_CATEGORY` |
| `Product` | `id`, `name`, `brand`, `price` | → category, rated, priced, picks |
| `Rating` | `overallScore`, `pros[]`, `cons[]`, `verdict` | `RATES` → Product |
| `SubScore` | `dimension`, `score` | `PART_OF` → Rating |
| `PriceEntry` | `date`, `price`, `retailer` | `PRICE_FOR` → Product |
| `BuyingIntent` | `category`, `maxBudget`, `priorities[]` | user anchor |
| `BuyingPlan` | `reasoning`, `comparisonSummary`, `timingAdvice` | user anchor |

**Worlds view parameters:** declare under `parameters:` in YAML; reference in Cypher as `$categoryId`, `$maxPrice`, `$productIds`, etc. Types: `string`, `number`, `integer`, `"string[]"`.

---

## Cypher building blocks (quick reference)

| Clause | Purpose | Example |
|--------|---------|---------|
| `MATCH` | Find patterns | `MATCH (p:Product {id: $productId})` |
| `OPTIONAL MATCH` | Left-outer join; nulls if missing | `OPTIONAL MATCH (ss:SubScore)-[:PART_OF]->(r)` |
| `WHERE` | Filter rows | `WHERE p.price <= $maxPrice` |
| `WITH` | Pipeline / aggregate / rename | `WITH p, r ORDER BY r.overallScore DESC LIMIT 5` |
| `RETURN` | Output columns | `RETURN p.name AS name, r.overallScore AS score` |
| `ORDER BY` | Sort | `ORDER BY score DESC, p.price ASC` |
| `LIMIT` / `SKIP` | Pagination | `LIMIT $limit` |
| `collect()` | List from rows | `collect({dim: ss.dimension, score: ss.score})` |
| `UNWIND` | Expand a list | `UNWIND $productIds AS pid` |
| `DISTINCT` | Dedupe | `RETURN DISTINCT p.brand` |
| `round()` | Numeric format | `round(valueScore, 2)` |

**Relationship direction:** `(a)-[:REL]->(b)` means `a` points to `b`. Reverse with `<-`.

**Id types:** Mock API uses numeric ids in JSON (`101`); in the graph they are usually stored as **strings** (`"101"`). Parameters should match ingestion (prefer string ids in views).

---

## Views already in this repo (`buying-views.yml`)

| View name | Parameters | Idea |
|-----------|------------|------|
| `top-rated-by-category` | `categoryId`, `limit` | Match category → product → rating, sort by score |
| `budget-picks` | `categoryId`, `maxPrice` | Filter price, compute value score `score/price` |
| `price-trend` | `productId` | All `PriceEntry` nodes for one product |
| `compare-products` | `productIds[]` | Side-by-side + `collect` sub-scores |
| `user-buying-history` | (none) | User anchors + optional runner/budget picks |

Copy-paste templates live in that file; the sections below extend the same patterns.

---

## Extended examples (copy into new views)

Add a block under `views:` in `buying-views.yml` or use the ready-made entries in `views/extended-examples.yml`.

### 1. Leader on one sub-score dimension

Find laptops with **battery life** sub-score at least `$minScore`:

```cypher
MATCH (p:Product)-[:IN_CATEGORY]->(c:Category {id: $categoryId})
MATCH (r:Rating)-[:RATES]->(p)
MATCH (ss:SubScore)-[:PART_OF]->(r)
WHERE ss.dimension = $dimension AND ss.score >= $minScore
RETURN p.name AS name, p.brand AS brand, p.price AS price,
       r.overallScore AS overall, ss.score AS dimensionScore
ORDER BY ss.score DESC, r.overallScore DESC
LIMIT $limit
```

Parameters: `categoryId`, `dimension` (e.g. `battery_life`), `minScore`, `limit`.

### 2. Cheapest product at or above a score floor

```cypher
MATCH (p:Product)-[:IN_CATEGORY]->(c:Category {id: $categoryId})
MATCH (r:Rating)-[:RATES]->(p)
WHERE r.overallScore >= $minOverall
WITH p, r ORDER BY p.price ASC
RETURN p.name AS name, p.price AS price, r.overallScore AS score
LIMIT 1
```

### 3. Latest price vs current list price (simple drop signal)

Assumes multiple `PriceEntry` nodes per product; compares max date entry to `p.price`:

```cypher
MATCH (p:Product {id: $productId})
MATCH (pe:PriceEntry)-[:PRICE_FOR]->(p)
WITH p, pe ORDER BY pe.date DESC
WITH p, collect(pe)[0] AS latest
RETURN p.name AS name, p.price AS currentPrice,
       latest.price AS lastRecordedPrice, latest.date AS asOf,
       p.price - latest.price AS delta
```

### 4. Brand leaderboard in a category

```cypher
MATCH (p:Product)-[:IN_CATEGORY]->(c:Category {id: $categoryId})
MATCH (r:Rating)-[:RATES]->(p)
WITH p.brand AS brand, avg(r.overallScore) AS avgScore, count(p) AS productCount
WHERE productCount >= $minProducts
RETURN brand, round(avgScore, 1) AS avgScore, productCount
ORDER BY avgScore DESC
```

### 5. Products sharing a high sub-score (pairwise hint)

```cypher
MATCH (p1:Product)-[:IN_CATEGORY]->(c:Category {id: $categoryId})
MATCH (p2:Product)-[:IN_CATEGORY]->(c)
WHERE id(p1) < id(p2)
MATCH (r1:Rating)-[:RATES]->(p1)
MATCH (r2:Rating)-[:RATES]->(p2)
MATCH (ss1:SubScore {dimension: $dimension})-[:PART_OF]->(r1)
MATCH (ss2:SubScore {dimension: $dimension})-[:PART_OF]->(r2)
WHERE ss1.score >= $minScore AND ss2.score >= $minScore
RETURN p1.name AS productA, p2.name AS productB,
       ss1.score AS scoreA, ss2.score AS scoreB
LIMIT 20
```

### 6. Unwind a list parameter (alternative to `IN`)

```cypher
UNWIND $productIds AS pid
MATCH (p:Product {id: pid})
MATCH (r:Rating)-[:RATES]->(p)
RETURN pid, p.name AS name, r.overallScore AS score
ORDER BY score DESC
```

### 7. Buying plans that picked a product as top pick

```cypher
MATCH (p:Product {id: $productId})<-[:TOP_PICK]-(bp:BuyingPlan)-[:PLAN_FOR]->(bi:BuyingIntent)
RETURN bi.category AS category, bi.maxBudget AS budget,
       bp.reasoning AS reasoning, bp.timingAdvice AS timing
ORDER BY bi.category
```

### 8. Count nodes by label (sanity check after ingestion)

```cypher
MATCH (n)
RETURN labels(n)[0] AS label, count(*) AS count
ORDER BY count DESC
```

Run ad hoc in Neo4j Browser or a one-off view with no parameters when debugging realm link.

### 9. Full path: category → plan picks (graph navigation)

```cypher
MATCH (c:Category {id: $categoryId})<-[:IN_CATEGORY]-(top:Product)
      <-[:TOP_PICK]-(bp:BuyingPlan)-[:PLAN_FOR]->(bi:BuyingIntent)
WHERE bi.category = $categoryId
RETURN c.name AS category, bi.maxBudget AS budget,
       top.name AS topPick, bp.reasoning AS reasoning
LIMIT $limit
```

### 10. Similar products (after `similar-products` producer)

```cypher
MATCH (p:Product {id: $productId})-[:SIMILAR_TO]->(other:Product)
MATCH (r:Rating)-[:RATES]->(other)
RETURN other.name AS name, other.brand AS brand, other.price AS price,
       r.overallScore AS score
ORDER BY score DESC
LIMIT $limit
```

---

## YAML view skeleton (Embabel Worlds)

```yaml
views:
  my-new-view:
    description: "One-line purpose for the console"
    parameters:
      categoryId: { type: string, required: true }
      limit: { type: integer, default: 10 }
    ai:
      hint: "Optional: natural-language hint for LLM-assisted exploration"
    cypher: |
      MATCH (c:Category {id: $categoryId})<-[:IN_CATEGORY]-(p:Product)
      RETURN c.name AS category, count(p) AS products
```

Rules of thumb:

- Keep **one main question** per view; compose complex flows with `WITH` or multiple views.
- Use **`OPTIONAL MATCH`** for runner-up / budget picks / sub-scores that may be missing.
- Prefer **`AS alias`** names that read well in console tables.
- Add **`ai.hint`** when the result needs user context (session history, “explain value score”, etc.).

---

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Wrong id type (`101` vs `"101"`) | Align with ingested property type; use string ids in parameters |
| Cartesian product explosion | Connect patterns in one `MATCH` chain; filter early with `WHERE` |
| `collect()` duplicates | Aggregate in `WITH` before second `MATCH`, or use `collect(DISTINCT …)` |
| Forgetting `LIMIT` on exploratory queries | Always cap rows in shared views |
| Relationship direction reversed | Read arrow as “from left node to right node” |

---

## Learn more

- Existing production views: [`views/buying-views.yml`](views/buying-views.yml)
- Extra view definitions: [`views/extended-examples.yml`](views/extended-examples.yml)
- Domain types: [`types/product-types.yml`](types/product-types.yml)
- [Neo4j Cypher manual](https://neo4j.com/docs/cypher-manual/current/) — full language reference

After linking the realm, run views from the Worlds console and iterate queries in Neo4j Browser against the same graph.
