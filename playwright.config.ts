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
      use: { ...devices["Desktop Chrome"] },
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
