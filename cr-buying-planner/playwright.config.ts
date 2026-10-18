import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const root = __dirname;

/**
 * The fixture console is the buying-planner UI (port 8901) backed by the
 * synthetic mock API (port 8900). It is the demo surface that runs without
 * the Worlds appliance, Docker, or an LLM key.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:8901",
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
    channel: "chrome",
  },
  webServer: [
    {
      command: "bash scripts/serve-mock-api.sh",
      cwd: root,
      url: "http://127.0.0.1:8900/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "python3 -m http.server 8901 --bind 127.0.0.1",
      cwd: path.join(root, "ui"),
      url: "http://127.0.0.1:8901",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
