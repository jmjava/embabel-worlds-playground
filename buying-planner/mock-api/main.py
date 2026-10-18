"""Buying Planner — Mock API.

Loads synthetic product ratings from data/seed.json
and exposes them as a lightweight REST API on port 8900.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

DATA_PATH = Path(__file__).resolve().parent / "data" / "seed.json"

app = FastAPI(
    title="Buying Planner — Mock API",
    version="0.1.0",
    description="Synthetic product ratings, pricing, and comparison data.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory data store ────────────────────────────────────────────

_categories: list[dict] = []
_products: list[dict] = []
_ratings: list[dict] = []
_price_history: list[dict] = []

_products_by_id: dict[int, dict] = {}
_ratings_by_product: dict[int, dict] = {}
_history_by_product: dict[int, list[dict]] = {}


def _load_seed() -> None:
    global _categories, _products, _ratings, _price_history
    global _products_by_id, _ratings_by_product, _history_by_product

    raw = json.loads(DATA_PATH.read_text())
    _categories = raw["categories"]
    _products = raw["products"]
    _ratings = raw["ratings"]
    _price_history = raw["price_history"]

    _products_by_id = {p["id"]: p for p in _products}
    _ratings_by_product = {r["product_id"]: r for r in _ratings}
    _history_by_product = {h["product_id"]: h["entries"] for h in _price_history}


@app.on_event("startup")
async def _startup() -> None:
    _load_seed()


# ── Helpers ──────────────────────────────────────────────────────────

def _merge_rating(product: dict) -> dict:
    """Return a copy of *product* with its rating fields merged in."""
    rating = _ratings_by_product.get(product["id"])
    if rating is None:
        return {**product, "overall_score": None, "sub_scores": {}, "pros": [], "cons": [], "verdict": None}
    return {
        **product,
        "overall_score": rating["overall_score"],
        "sub_scores": rating["sub_scores"],
        "pros": rating["pros"],
        "cons": rating["cons"],
        "verdict": rating["verdict"],
    }


def _matches_text(product: dict, query: str) -> bool:
    """Return True if *query* appears in searchable product fields."""
    q = query.lower()
    rating = _ratings_by_product.get(product["id"], {})
    searchable = " ".join([
        product.get("name", ""),
        product.get("brand", ""),
        product.get("model", ""),
        " ".join(rating.get("pros", [])),
        " ".join(rating.get("cons", [])),
        rating.get("verdict", ""),
    ]).lower()
    return q in searchable


# ── Endpoints ────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    """Health check."""
    return {"status": "ok", "products": len(_products), "categories": len(_categories)}


@app.get("/api/categories")
async def list_categories():
    """List all product categories."""
    return _categories


@app.get("/api/categories/{category_id}/products")
async def list_products_in_category(
    category_id: str,
    max_price: Optional[float] = Query(None, description="Maximum price filter"),
    min_score: Optional[int] = Query(None, description="Minimum overall score filter"),
    sort_by: Optional[str] = Query(None, description="Sort by: price, score, or name"),
):
    """List products in a category with optional filters and sorting."""
    if not any(c["id"] == category_id for c in _categories):
        raise HTTPException(status_code=404, detail=f"Category '{category_id}' not found")

    results = [p for p in _products if p["category_id"] == category_id]

    if max_price is not None:
        results = [p for p in results if p["price"] <= max_price]

    if min_score is not None:
        results = [
            p for p in results
            if (_ratings_by_product.get(p["id"], {}).get("overall_score") or 0) >= min_score
        ]

    if sort_by == "price":
        results.sort(key=lambda p: p["price"])
    elif sort_by == "score":
        results.sort(
            key=lambda p: _ratings_by_product.get(p["id"], {}).get("overall_score", 0),
            reverse=True,
        )
    elif sort_by == "name":
        results.sort(key=lambda p: p["name"])

    return [_merge_rating(p) for p in results]


@app.get("/api/products/{product_id}")
async def get_product(product_id: int):
    """Get a single product with its full rating merged in."""
    product = _products_by_id.get(product_id)
    if product is None:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    return _merge_rating(product)


@app.get("/api/products/{product_id}/price-history")
async def get_price_history(product_id: int):
    """Get the price history entries for a product."""
    if product_id not in _products_by_id:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    entries = _history_by_product.get(product_id, [])
    return {"product_id": product_id, "entries": entries}


@app.get("/api/compare")
async def compare_products(
    ids: str = Query(..., description="Comma-separated product IDs"),
):
    """Side-by-side comparison payload for multiple products."""
    try:
        id_list = [int(i.strip()) for i in ids.split(",") if i.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="'ids' must be comma-separated integers")

    if not id_list:
        raise HTTPException(status_code=400, detail="Provide at least one product ID")

    products = []
    for pid in id_list:
        product = _products_by_id.get(pid)
        if product is None:
            raise HTTPException(status_code=404, detail=f"Product {pid} not found")
        products.append(_merge_rating(product))

    return {"products": products}


@app.get("/api/search")
async def search_products(
    q: str = Query(..., min_length=1, description="Search query"),
):
    """Keyword search across product names, brands, pros, cons, and verdicts."""
    hits = [_merge_rating(p) for p in _products if _matches_text(p, q)]
    return {"query": q, "count": len(hits), "results": hits}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8900, reload=True)
