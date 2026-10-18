import { expect, test } from "./fixture-console";

test("fixture API serves the synthetic catalog", async ({ request }) => {
  const health = await request.get("http://127.0.0.1:8900/api/health");
  expect(health.ok()).toBeTruthy();
  expect(await health.json()).toEqual({ status: "ok", products: 34, categories: 3 });
});

test("category picker lists the three fixture categories", async ({ console }) => {
  await expect(console.category("Washing Machines")).toBeVisible();
  await expect(console.category("Laptops")).toBeVisible();
  await expect(console.category("Mattresses")).toBeVisible();
  await expect(console.category("Laptops")).toContainText("5 rating factors");
});

test("laptop flow ranks fixture products into a buying plan", async ({ console }) => {
  await console.chooseCategory("Laptops");
  await expect(console.page.getByRole("checkbox", { name: "Battery Life" })).toBeChecked();
  await expect(console.page.locator("#budget-value")).toHaveText("$2,500");

  await console.page.locator("#extra-input").fill("quiet for travel");
  await console.findProducts();

  await expect(console.page.getByRole("heading", { name: "Top Rated Laptops" })).toBeVisible();
  const pro = console.product('MacBook Pro 14" M3 Pro');
  await expect(pro).toContainText("92");
  await expect(pro).toContainText("$1,999");
  await expect(pro).toContainText("The best all-around laptop money can buy");

  await pro.getByRole("button", { name: "View Details" }).click();
  await expect(pro).toContainText("Mini-LED XDR display");

  await console.selectForCompare('MacBook Pro 14" M3 Pro');
  await console.selectForCompare('MacBook Air 15" M3');
  await console.selectForCompare("Zenbook 14 OLED");
  await expect(console.page.locator("#compare-count")).toHaveText("3");

  await console.compareSelected();
  await expect(console.page.locator(".compare-table")).toContainText("Overall Score");
  await expect(console.page.locator(".compare-table")).toContainText("Battery Life");
  await expect(console.page.locator(".sparkline-svg")).toHaveCount(3);

  await console.generatePlan();
  const plan = console.page.locator("#plan-content");
  await expect(plan.locator(".top-pick")).toContainText('MacBook Pro 14" M3 Pro');
  await expect(plan.locator(".top-pick")).toContainText("92");
  await expect(plan.locator(".runner-up")).toContainText('MacBook Air 15" M3');
  await expect(plan.locator(".budget-pick")).toContainText("Zenbook 14 OLED");
  await expect(plan.locator(".budget-pick")).toContainText("$899");
  await expect(plan.getByRole("heading", { name: "Comparison Summary" })).toBeVisible();
  await expect(plan.getByRole("heading", { name: "Timing Advice" })).toBeVisible();
});

test("a tight budget keeps only products inside the cap", async ({ console }) => {
  await console.chooseCategory("Laptops");
  await console.setBudget(700);
  await console.findProducts();

  await expect(console.product("IdeaPad Slim 5 16")).toBeVisible();
  await expect(console.product("Swift Go 14")).toHaveCount(0);
  await expect(console.product('MacBook Air 15" M3')).toHaveCount(0);
  await expect(console.page.locator(".product-card")).toHaveCount(1);
});

test("a zero budget shows the empty catalog state", async ({ console }) => {
  await console.chooseCategory("Washing Machines");
  await console.setBudget(0);
  await console.findProducts();
  await expect(console.page.locator("#product-grid")).toContainText("No products match your filters");
  await expect(console.page.locator(".product-card")).toHaveCount(0);
});

test("compare starts at two products and stops at three", async ({ console }) => {
  await console.chooseCategory("Mattresses");
  await console.findProducts();

  await console.selectForCompare("Nectar Original Memory Foam");
  await expect(console.page.locator("#compare-bar")).toHaveClass(/hidden/);

  await console.selectForCompare("Purple Original");
  await expect(console.page.getByRole("button", { name: /Compare Selected \(2\)/ })).toBeVisible();

  await console.selectForCompare("Nectar Premier");
  await console.product("Saatva Classic").locator('input[type="checkbox"]').click();
  await expect(console.product("Saatva Classic").locator('input[type="checkbox"]')).not.toBeChecked();
  await expect(console.page.locator("#compare-count")).toHaveText("3");
});

test("price sort puts the cheapest fixture laptop first", async ({ console }) => {
  await console.chooseCategory("Laptops");
  await console.findProducts();
  await expect(console.page.locator(".product-card").first()).toContainText('MacBook Pro 14" M3 Pro');

  await console.page.locator("#sort-select").selectOption("price-asc");
  await expect(console.page.locator(".product-card").first()).toContainText("IdeaPad Slim 5 16");
  await expect(console.page.locator(".product-card").first()).toContainText("$649");
});

test("back and start over return to earlier steps", async ({ console }) => {
  await console.chooseCategory("Washing Machines");
  await console.findProducts();
  await console.page.locator('#screen-products .back-btn').click();
  await expect(console.page.getByRole("heading", { name: "Set your preferences" })).toBeVisible();

  await console.page.locator("#breadcrumb .crumb", { hasText: "Category" }).click();
  await expect(console.page.getByRole("heading", { name: "What are you shopping for?" })).toBeVisible();

  await console.chooseCategory("Laptops");
  await console.findProducts();
  await console.selectForCompare('MacBook Air 15" M3');
  await console.selectForCompare("Zenbook 14 OLED");
  await console.compareSelected();
  await console.generatePlan();
  await console.page.getByRole("button", { name: "Start Over" }).click();
  await expect(console.page.getByRole("heading", { name: "What are you shopping for?" })).toBeVisible();

  await console.chooseCategory("Laptops");
  await console.findProducts();
  await expect(console.page.locator("#compare-bar")).toHaveClass(/hidden/);
  await expect(console.page.locator('.product-card input[type="checkbox"]:checked')).toHaveCount(0);
});

test("the AI toggle falls back to local ranking when the agent is down", async ({ console }) => {
  await console.chooseCategory("Laptops");
  await console.findProducts();
  await console.selectForCompare('MacBook Pro 14" M3 Pro');
  await console.selectForCompare("Zenbook 14 OLED");
  await console.compareSelected();

  await console.page.locator(".agent-toggle").click();
  await expect(console.page.locator("#agent-toggle-cb")).toBeChecked();
  await console.generatePlan();

  await expect(console.page.locator("#toast")).toContainText("Agent unavailable, using local ranking");
  await expect(console.page.locator(".top-pick")).toContainText('MacBook Pro 14" M3 Pro');
  await expect(console.page.locator(".runner-up")).toContainText("Zenbook 14 OLED");
});

test("the category screen explains a missing fixture API", async ({ page }) => {
  await page.route("http://localhost:8900/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator("#category-cards")).toContainText("Could not load categories");
  await expect(page.locator(".category-card")).toHaveCount(0);
});
