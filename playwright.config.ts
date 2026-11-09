import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Configuration for School ERP
 * Configures multi-tenant testing, local web server, and mobile viewport presets.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // Ensure sequential flow for tenant lifecycle
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to preserve database tenant state transitions
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
