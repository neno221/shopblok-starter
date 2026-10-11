import { defineConfig, devices } from "@playwright/test";

// The suites run against a storefront that is already up: `next build && next start -p 8000`, with
// the `markets` global filled (production has no fallback; SETUP.md, "Markets library (T10)").
// Nothing here starts it, so the same specs can run in CI (T16), where bootstrap does the filling.
// Build fresh before a run that changes the map: `next start` can serve a page from an earlier
// map after a restart (SETUP.md, "After a restart").
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // One worker, so the specs run one after the other. The admin specs all log in as the admin
  // bootstrap made, and Payload keeps a user's sessions in one array on the user document: two
  // logins at the same moment overwrite each other, and the JWT of the session that lost is refused
  // with 403 (seen in T17: `payload-cache` and `payload-admin` starting together).
  workers: 1,
  forbidOnly: Boolean(process.env["CI"]),
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env["E2E_BASE_URL"] ?? "http://localhost:8000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /payload-locales\.spec\.ts/,
    },
    // Saves the `markets` global (and puts it back), which the other suites read through the proxy:
    // it runs when all of them are done.
    {
      name: "locales",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /payload-locales\.spec\.ts/,
      dependencies: ["chromium"],
    },
  ],
});
