import { defineConfig, devices } from "@playwright/test";

const e2eDatabaseUrl = "postgresql://postgres:postgres@127.0.0.1:54329/assistantbot_e2e?schema=public";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
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
    reuseExistingServer: !process.env.CI,
    env: {
      E2E_AUTH_ENABLED: "1",
      E2E_SKIP_DEMO_SEEDS: "1",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      DATABASE_URL: e2eDatabaseUrl,
      DIRECT_URL: e2eDatabaseUrl,
    },
  },
});
