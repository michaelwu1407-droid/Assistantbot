import path from "node:path";
import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";

test.use({ storageState: path.join(process.cwd(), "e2e", ".auth", "team.json") });

async function readFixtures() {
  return JSON.parse(
    await fs.readFile(path.join(process.cwd(), "e2e", ".auth", "fixtures.json"), "utf8"),
  ) as { dbAvailable: boolean };
}

test("team members are redirected away from the global inbox and billing settings", async ({ page }) => {
  const fixture = await readFixtures();
  test.skip(!fixture.dbAvailable, "CRM Playwright tests require the isolated Postgres harness.");

  await page.goto("/crm/inbox");
  await expect(page).toHaveURL(/\/crm\/dashboard/);

  await page.goto("/crm/settings/billing");
  await expect(page).toHaveURL(/\/crm\/settings$/);
});

test("team members only see their assigned scheduled job", async ({ page }) => {
  const fixture = await readFixtures();
  test.skip(!fixture.dbAvailable, "CRM Playwright tests require the isolated Postgres harness.");

  await page.goto("/crm/schedule");
  await expect(page.getByText("E2E Scheduled Hot Water Fix")).toBeVisible();
  await expect(page.getByText("E2E Owner Inspection")).toHaveCount(0);
});
