/* CR Buying Planner — click-through demo (vanilla JS) */

const API = "http://localhost:8900";

const EMOJI_MAP = {
  "washing-machines": "🧺",
  "laptops": "💻",
  "mattresses": "🛏️",
};

const STEP_LABELS = [
  "Category",
  "Preferences",
  "Products",
  "Compare",
  "Plan",
];

// ── State ────────────────────────────────────────────────────────

let state = {
  currentStep: 1,
  categories: [],
  selectedCategory: null,
  budget: 3000,
  priorities: [],
  products: [],
  compareIds: new Set(),
  compareData: null,
  priceHistories: {},
};

// ── Navigation ───────────────────────────────────────────────────

function goTo(step) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  const target = document.querySelector(`.screen[data-step="${step}"]`);
  if (target) {
    target.classList.add("active");
    target.style.animation = "none";
    target.offsetHeight; // reflow
    target.style.animation = "";
  }
  state.currentStep = step;
  renderBreadcrumb();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderBreadcrumb() {
  const bc = document.getElementById("breadcrumb");
  bc.innerHTML = STEP_LABELS.map((label, i) => {
    const step = i + 1;
    const active = step === state.currentStep;
    const past = step < state.currentStep;
    const classes = ["crumb"];
    if (active) classes.push("active");
    if (past) classes.push("clickable");
    const sep = i < STEP_LABELS.length - 1 ? '<span class="sep">›</span>' : "";
    return `<span class="${classes.join(" ")}" data-nav="${step}">${label}</span>${sep}`;
  }).join("");

  bc.querySelectorAll(".crumb.clickable").forEach((el) => {
    el.addEventListener("click", () => goTo(parseInt(el.dataset.nav)));
  });
}

// ── Helpers ──────────────────────────────────────────────────────

function humanize(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmt(price) {
  return "$" + price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function scoreClass(score) {
  if (score >= 80) return "good";
  if (score >= 60) return "mid";
  return "low";
}

function scoreColor(score) {
  if (score >= 80) return "var(--score-good)";
  if (score >= 60) return "var(--score-mid)";
  return "var(--score-low)";
}

async function api(path) {
  const resp = await fetch(API + path);
  if (!resp.ok) throw new Error(`API ${resp.status}: ${path}`);
  return resp.json();
}

// ── Screen 1: Categories ─────────────────────────────────────────

async function loadCategories() {
  try {
    state.categories = await api("/api/categories");
  } catch {
    state.categories = [];
  }
  renderCategories();
}

function renderCategories() {
  const grid = document.getElementById("category-cards");
  if (!state.categories.length) {
    grid.innerHTML = '<p style="color:var(--cr-text-light)">Could not load categories. Is the API running on port 8900?</p>';
    return;
  }
  grid.innerHTML = state.categories.map((cat) => {
    const emoji = EMOJI_MAP[cat.id] || cat.icon || "📦";
    return `
      <div class="category-card" data-id="${cat.id}">
        <span class="icon">${emoji}</span>
        <div class="name">${cat.name}</div>
        <div class="count">${cat.priorities.length} rating factors</div>
      </div>`;
  }).join("");

  grid.querySelectorAll(".category-card").forEach((card) => {
    card.addEventListener("click", () => selectCategory(card.dataset.id));
  });
}

function selectCategory(catId) {
  state.selectedCategory = state.categories.find((c) => c.id === catId);
  if (!state.selectedCategory) return;
  state.compareIds.clear();

  // Set up preferences screen
  const cat = state.selectedCategory;
  document.getElementById("pref-subtitle").textContent =
    `Configure filters for ${cat.name}`;

  const maxPrices = { "washing-machines": 1500, "laptops": 2500, "mattresses": 3500 };
  const maxP = maxPrices[cat.id] || 3000;
  const slider = document.getElementById("budget-slider");
  slider.max = maxP;
  slider.value = maxP;
  state.budget = maxP;
  document.getElementById("budget-value").textContent = fmt(maxP);

  const checks = document.getElementById("priority-checks");
  checks.innerHTML = cat.priorities.map((p) => `
    <label><input type="checkbox" value="${p}" checked> ${humanize(p)}</label>
  `).join("");

  goTo(2);
}

// ── Screen 2: Budget slider ──────────────────────────────────────

document.getElementById("budget-slider").addEventListener("input", (e) => {
  state.budget = parseInt(e.target.value);
  document.getElementById("budget-value").textContent = fmt(state.budget);
});

document.getElementById("find-products-btn").addEventListener("click", async () => {
  state.priorities = [...document.querySelectorAll("#priority-checks input:checked")].map((c) => c.value);
  await loadProducts();
  goTo(3);
});

// ── Screen 3: Products ───────────────────────────────────────────

async function loadProducts() {
  const cat = state.selectedCategory;
  if (!cat) return;
  try {
    state.products = await api(`/api/categories/${cat.id}/products?max_price=${state.budget}&sort_by=score`);
  } catch {
    state.products = [];
  }
  document.getElementById("products-title").textContent = `Top Rated ${cat.name}`;
  renderProducts();
}

function sortProducts(key) {
  const arr = [...state.products];
  if (key === "score") arr.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0));
  else if (key === "price-asc") arr.sort((a, b) => a.price - b.price);
  else if (key === "price-desc") arr.sort((a, b) => b.price - a.price);
  else if (key === "name") arr.sort((a, b) => a.name.localeCompare(b.name));
  state.products = arr;
  renderProducts();
}

document.getElementById("sort-select").addEventListener("change", (e) => sortProducts(e.target.value));

function renderProducts() {
  const grid = document.getElementById("product-grid");
  if (!state.products.length) {
    grid.innerHTML = '<p style="color:var(--cr-text-light)">No products match your filters. Try raising your budget.</p>';
    updateCompareBar();
    return;
  }

  grid.innerHTML = state.products.map((p) => {
    const sc = p.overall_score || 0;
    const checked = state.compareIds.has(p.id) ? "checked" : "";
    const subHtml = p.sub_scores
      ? Object.entries(p.sub_scores).map(([k, v]) => `
        <div class="sub-score-row">
          <span class="sub-score-label">${humanize(k)}</span>
          <div class="sub-score-bar-bg"><div class="sub-score-bar" style="width:${v}%;background:${scoreColor(v)}"></div></div>
          <span class="sub-score-val">${v}</span>
        </div>`).join("")
      : "";

    const prosHtml = (p.pros || []).map((t) => `<li>${t}</li>`).join("");
    const consHtml = (p.cons || []).map((t) => `<li>${t}</li>`).join("");

    return `
    <div class="product-card" data-id="${p.id}">
      <div class="product-card-top">
        <div class="score-badge ${scoreClass(sc)}">${sc}</div>
        <div class="product-info">
          <div class="brand">${p.brand}</div>
          <div class="name">${p.name}</div>
          <div class="price">${fmt(p.price)}</div>
          ${p.cr_verdict ? `<div class="verdict">${p.cr_verdict}</div>` : ""}
        </div>
      </div>
      <div class="product-card-actions">
        <label class="compare-check"><input type="checkbox" data-cmp="${p.id}" ${checked}> Compare</label>
        <button class="details-toggle" data-dtl="${p.id}">View Details ▾</button>
      </div>
      <div class="product-details" id="details-${p.id}">
        ${subHtml}
        <div class="proscons">
          <div><h4>Pros</h4><ul class="pros-list">${prosHtml}</ul></div>
          <div><h4>Cons</h4><ul class="cons-list">${consHtml}</ul></div>
        </div>
      </div>
    </div>`;
  }).join("");

  // compare checkboxes
  grid.querySelectorAll('input[data-cmp]').forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const id = parseInt(e.target.dataset.cmp);
      if (e.target.checked) {
        if (state.compareIds.size >= 3) {
          e.target.checked = false;
          return;
        }
        state.compareIds.add(id);
      } else {
        state.compareIds.delete(id);
      }
      updateCompareBar();
    });
  });

  // details toggles
  grid.querySelectorAll(".details-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const panel = document.getElementById(`details-${btn.dataset.dtl}`);
      const open = panel.classList.toggle("open");
      btn.textContent = open ? "Hide Details ▴" : "View Details ▾";
    });
  });

  updateCompareBar();
}

function updateCompareBar() {
  const n = state.compareIds.size;
  const bar = document.getElementById("compare-bar");
  bar.classList.toggle("hidden", n < 2);
  document.getElementById("compare-count").textContent = n;
}

document.getElementById("compare-btn").addEventListener("click", async () => {
  await loadCompare();
  goTo(4);
});

// ── Screen 4: Compare ────────────────────────────────────────────

async function loadCompare() {
  const ids = [...state.compareIds].join(",");
  try {
    state.compareData = await api(`/api/compare?ids=${ids}`);
  } catch {
    state.compareData = { products: [] };
  }

  state.priceHistories = {};
  await Promise.all([...state.compareIds].map(async (id) => {
    try {
      const ph = await api(`/api/products/${id}/price-history`);
      state.priceHistories[id] = ph.entries || [];
    } catch {
      state.priceHistories[id] = [];
    }
  }));

  renderCompare();
}

function sparklineSVG(entries, width, height) {
  if (!entries || entries.length < 2) return "";
  const prices = entries.map((e) => e.price);
  const mn = Math.min(...prices);
  const mx = Math.max(...prices);
  const range = mx - mn || 1;
  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const points = prices.map((p, i) => {
    const x = pad + (i / (prices.length - 1)) * w;
    const y = pad + h - ((p - mn) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return `<svg class="sparkline-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <polyline fill="none" stroke="var(--cr-red)" stroke-width="2" stroke-linejoin="round" points="${points}"/>
    <circle cx="${points.split(" ").pop().split(",")[0]}" cy="${points.split(" ").pop().split(",")[1]}" r="3" fill="var(--cr-red)"/>
  </svg>`;
}

function renderCompare() {
  const products = (state.compareData && state.compareData.products) || [];
  if (!products.length) return;
  const table = document.getElementById("compare-table");
  const cols = products.length + 1;
  const gridCols = `180px repeat(${products.length}, 1fr)`;

  let rows = "";

  // Header row: product names
  rows += `<div class="compare-row header" style="grid-template-columns:${gridCols}">
    <div class="compare-cell label"></div>
    ${products.map((p) => `<div class="compare-cell" style="text-align:center"><strong>${p.brand}</strong><br>${p.name}</div>`).join("")}
  </div>`;

  // Overall score
  rows += `<div class="compare-row" style="grid-template-columns:${gridCols}">
    <div class="compare-cell label">Overall Score</div>
    ${products.map((p) => `<div class="compare-cell" style="text-align:center">
      <div class="score-badge ${scoreClass(p.overall_score || 0)}">${p.overall_score || "–"}</div>
    </div>`).join("")}
  </div>`;

  // Price
  rows += `<div class="compare-row" style="grid-template-columns:${gridCols}">
    <div class="compare-cell label">Price</div>
    ${products.map((p) => `<div class="compare-cell" style="text-align:center"><span class="price-tag">${fmt(p.price)}</span></div>`).join("")}
  </div>`;

  // Sub-scores
  const allKeys = products[0].sub_scores ? Object.keys(products[0].sub_scores) : [];
  allKeys.forEach((key) => {
    rows += `<div class="compare-row" style="grid-template-columns:${gridCols}">
      <div class="compare-cell label">${humanize(key)}</div>
      ${products.map((p) => {
        const v = (p.sub_scores || {})[key] || 0;
        return `<div class="compare-cell">
          <div class="bar-wrap">
            <div class="bar-bg"><div class="bar-fg" style="width:${v}%;background:${scoreColor(v)}"></div></div>
            <span class="bar-val">${v}</span>
          </div>
        </div>`;
      }).join("")}
    </div>`;
  });

  // Pros
  rows += `<div class="compare-row" style="grid-template-columns:${gridCols}">
    <div class="compare-cell label">Pros</div>
    ${products.map((p) => `<div class="compare-cell"><ul class="pros-list">${(p.pros || []).map((t) => `<li>${t}</li>`).join("")}</ul></div>`).join("")}
  </div>`;

  // Cons
  rows += `<div class="compare-row" style="grid-template-columns:${gridCols}">
    <div class="compare-cell label">Cons</div>
    ${products.map((p) => `<div class="compare-cell"><ul class="cons-list">${(p.cons || []).map((t) => `<li>${t}</li>`).join("")}</ul></div>`).join("")}
  </div>`;

  // Price history sparklines
  rows += `<div class="compare-row" style="grid-template-columns:${gridCols}">
    <div class="compare-cell label">Price Trend</div>
    ${products.map((p) => `<div class="compare-cell" style="text-align:center">${sparklineSVG(state.priceHistories[p.id], 140, 50)}</div>`).join("")}
  </div>`;

  table.innerHTML = rows;
}

document.getElementById("plan-btn").addEventListener("click", () => {
  generatePlan();
  goTo(5);
});

// ── Screen 5: Buying Plan (client-side) ──────────────────────────

function generatePlan() {
  const products = (state.compareData && state.compareData.products) || [];
  if (!products.length) return;

  const sorted = [...products].sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0));
  const topPick = sorted[0];
  const runnerUp = sorted.length > 1 ? sorted[1] : null;
  const byPrice = [...products].sort((a, b) => a.price - b.price);
  const budgetPick = byPrice[0].id !== topPick.id ? byPrice[0] : (byPrice.length > 1 ? byPrice[1] : null);

  let html = "";

  // Top Pick
  html += pickCard(topPick, "Top Pick", "top-pick", "top",
    `Highest overall score of ${topPick.overall_score} among your compared products.`);

  // Runner Up
  if (runnerUp && runnerUp.id !== topPick.id) {
    const diff = (topPick.overall_score || 0) - (runnerUp.overall_score || 0);
    html += pickCard(runnerUp, "Runner-Up", "runner-up", "runner",
      `Just ${diff} point${diff !== 1 ? "s" : ""} behind the top pick${runnerUp.price < topPick.price ? `, and ${fmt(topPick.price - runnerUp.price)} cheaper` : ""}.`);
  }

  // Budget Pick
  if (budgetPick && budgetPick.id !== topPick.id && (!runnerUp || budgetPick.id !== runnerUp.id)) {
    html += pickCard(budgetPick, "Budget Pick", "budget-pick", "budget",
      `The most affordable option at ${fmt(budgetPick.price)} with a solid score of ${budgetPick.overall_score || "–"}.`);
  }

  // Comparison summary
  html += `<div class="plan-section"><h3>Comparison Summary</h3><ul>`;
  if (products.length >= 2 && products[0].sub_scores) {
    const keys = Object.keys(products[0].sub_scores);
    keys.forEach((k) => {
      const vals = products.map((p) => ({ name: p.brand + " " + p.name.split(" ")[0], val: (p.sub_scores || {})[k] || 0 }));
      const best = vals.reduce((a, b) => a.val >= b.val ? a : b);
      html += `<li><strong>${humanize(k)}:</strong> ${best.name} leads with ${best.val}/100</li>`;
    });
  }
  html += `</ul></div>`;

  // Timing advice
  const timingLines = [];
  products.forEach((p) => {
    const entries = state.priceHistories[p.id] || [];
    if (entries.length >= 2) {
      const last = entries[entries.length - 1].price;
      const prev = entries[entries.length - 2].price;
      const first = entries[0].price;
      const totalDrop = ((first - last) / first) * 100;
      if (last < prev) {
        timingLines.push(`<strong>${p.brand} ${p.name.split(" ")[0]}</strong> dropped from ${fmt(prev)} to ${fmt(last)} last month (${totalDrop.toFixed(0)}% down over 6 months). Consider buying soon.`);
      } else if (last === prev) {
        timingLines.push(`<strong>${p.brand} ${p.name.split(" ")[0]}</strong> price is stable at ${fmt(last)}. No urgency, but check holiday sales.`);
      } else {
        timingLines.push(`<strong>${p.brand} ${p.name.split(" ")[0]}</strong> price rose to ${fmt(last)}. Wait for a promotional dip.`);
      }
    }
  });

  if (timingLines.length) {
    html += `<div class="plan-section"><h3>Timing Advice</h3>`;
    html += timingLines.map((l) => `<p>${l}</p>`).join("");
    html += `</div>`;
  }

  document.getElementById("plan-content").innerHTML = html;
}

function pickCard(product, label, cardClass, badgeClass, reason) {
  const sc = product.overall_score || 0;
  return `
  <div class="pick-card ${cardClass}">
    <div class="score-badge ${scoreClass(sc)}" style="font-size:1.2rem;width:60px;height:60px;">${sc}</div>
    <div class="pick-body">
      <span class="pick-badge ${badgeClass}">${label}</span>
      <div class="name">${product.name}</div>
      <div class="meta">${product.brand} · ${fmt(product.price)}</div>
      <div class="reason">${reason}</div>
    </div>
  </div>`;
}

// ── Restart ──────────────────────────────────────────────────────

document.getElementById("restart-btn").addEventListener("click", () => {
  state.compareIds.clear();
  state.compareData = null;
  state.priceHistories = {};
  goTo(1);
});

// ── Back buttons ─────────────────────────────────────────────────

document.querySelectorAll(".back-btn").forEach((btn) => {
  btn.addEventListener("click", () => goTo(parseInt(btn.dataset.target)));
});

// ── Boot ─────────────────────────────────────────────────────────

(async function init() {
  renderBreadcrumb();
  await loadCategories();
})();
