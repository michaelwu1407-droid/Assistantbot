import { defineConfig, devices } from "@playwright/test";

const e2eDatabaseUrl = "postgresql://postgres:postgres@127.0.0.1:54329/assistantbot_e2e?schema=public";
const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";
const vercelBypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const extraHTTPHeaders =
  vercelBypassSecret
    ? {
        "x-vercel-protection-bypass": vercelBypassSecret,
        "x-vercel-set-bypass-cookie": "true",
      }
    : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL,
    extraHTTPHeaders,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /visual\//,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Visual regression: lock viewport, slow animations off, narrow
      // pixel-diff tolerance. Snapshot baselines live next to specs and
      // ARE checked in — regenerate with `npm run test:visual:update`.
      name: "visual",
      testMatch: /visual\/.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
      expect: {
        toHaveScreenshot: {
          maxDiffPixelRatio: 0.01,
          animations: "disabled",
        },
      },
    },
    {
      name: "visual-mobile",
      testMatch: /visual\/.*\.spec\.ts/,
      use: {
        ...devices["iPhone 13"],
      },
      expect: {
        toHaveScreenshot: {
          maxDiffPixelRatio: 0.01,
          animations: "disabled",
        },
      },
    },
  ],
  webServer: {
    command: "npx next dev --port 3000",
    url: "http://localhost:3000",
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI || baseURL !== "http://localhost:3000",
    env: {
      E2E_AUTH_ENABLED: "1",
      E2E_SKIP_DEMO_SEEDS: "1",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      DATABASE_URL: e2eDatabaseUrl,
      DIRECT_URL: e2eDatabaseUrl,
    },
  },
});
