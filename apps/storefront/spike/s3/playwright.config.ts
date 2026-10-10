import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: /s3-.*\.spec\.ts/,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:8000" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
