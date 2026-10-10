import { defineConfig, devices } from "@playwright/test";

// S1's suite (docs/adr/0001, docs/plans/M0.md §6). It needs an empty `users` table, so it runs
// against its own database and server, started by spike/s1/run-column.sh, not against the bootstrapped
// stack that `playwright.config.ts` assumes.
export default defineConfig({
  testDir: "./spike/s1",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: [
    ["list"],
    ["json", { outputFile: process.env["S1_REPORT"] ?? "test-results/s1.json" }],
  ],
  use: {
    baseURL: process.env["E2E_BASE_URL"] ?? "http://localhost:8000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
