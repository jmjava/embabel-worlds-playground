import { test as base, expect, type Locator, type Page } from "@playwright/test";

/**
 * Browser handle for the CR Buying Planner fixture console.
 *
 * The UI talks to the synthetic catalog in mock-api/data/seed.json. Plans on
 * this console are ranked in the browser, so the suite proves the demo without
 * an OpenAI key or the Worlds appliance.
 */
export class FixtureConsole {
  constructor(readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto("/");
    await expect(this.page.getByRole("heading", { name: "What are you shopping for?" })).toBeVisible();
  }

  category(name: string): Locator {
    return this.page.locator(".category-card", { hasText: name });
  }

  product(name: string): Locator {
    return this.page.locator(".product-card", { hasText: name });
  }

  async chooseCategory(name: string): Promise<void> {
    await this.category(name).click();
    await expect(this.page.getByRole("heading", { name: "Set your preferences" })).toBeVisible();
    await expect(this.page.locator("#pref-subtitle")).toContainText(name);
  }

  async setBudget(amount: number): Promise<void> {
    const slider = this.page.locator("#budget-slider");
    await slider.fill(String(amount));
    await expect(this.page.locator("#budget-value")).toHaveText(usd(amount));
  }

  async findProducts(): Promise<void> {
    await this.page.getByRole("button", { name: "Find Products" }).click();
    await expect(this.page.locator("#screen-products")).toHaveClass(/active/);
  }

  async selectForCompare(name: string): Promise<void> {
    await this.product(name).locator('input[type="checkbox"]').check();
  }

  async compareSelected(): Promise<void> {
    await this.page.getByRole("button", { name: /Compare Selected/ }).click();
    await expect(this.page.getByRole("heading", { name: "Head to Head" })).toBeVisible();
  }

  async generatePlan(): Promise<void> {
    await this.page.getByRole("button", { name: "Generate Buying Plan" }).click();
    await expect(this.page.getByRole("heading", { name: "Your Buying Plan" })).toBeVisible();
  }
}

function usd(amount: number): string {
  return "$" + amount.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

type Fixtures = {
  console: FixtureConsole;
};

export const test = base.extend<Fixtures>({
  console: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const demo = new FixtureConsole(page);
    await demo.open();
    await use(demo);
    expect(errors, "fixture console raised page errors").toEqual([]);
  },
});

export { expect };
