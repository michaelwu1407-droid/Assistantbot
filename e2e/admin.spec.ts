import fs from "node:fs/promises";
import path from "node:path";
import { test, expect } from "@playwright/test";

test.use({ storageState: path.join(process.cwd(), "e2e", ".auth", "admin.json") });

async function readFixtures() {
  return JSON.parse(
    await fs.readFile(path.join(process.cwd(), "e2e", ".auth", "fixtures.json"), "utf8"),
  ) as { portalPath: string; dbAvailable: boolean };
}

test("admin can load core CRM pages with seeded data", async ({ page }) => {
  const fixture = await readFixtures();
  test.skip(!fixture.dbAvailable, "CRM Playwright tests require the isolated Postgres harness.");

  await page.goto("/crm/dashboard");
  await expect(page).toHaveURL(/\/crm\/dashboard/);
  await expect(page.getByText("E2E Lead Leak Quote")).toBeVisible();
  await expect(page.getByText("E2E Scheduled Hot Water Fix")).toBeVisible();

  await page.goto("/crm/inbox?contact=e2e_contact_scheduled");
  await expect(page.getByPlaceholder("Text E2E Scheduled Contact directly...")).toBeVisible();

  await page.goto("/crm/schedule");
  await expect(page.getByText("E2E Scheduled Hot Water Fix")).toBeVisible();
  await expect(page.getByText("E2E Owner Inspection")).toBeVisible();
});

test("admin can change Tracey call handling mode from settings", async ({ page }) => {
  const fixture = await readFixtures();
  test.skip(!fixture.dbAvailable, "CRM Playwright tests require the isolated Postgres harness.");

  await page.goto("/crm/settings");
  await expect(page.getByText("Phone & call handling")).toBeVisible();
  await expect(page.getByText("Next step: turn on Backup AI from your phone")).toBeVisible();

  await page.getByRole("button", { name: "100% AI" }).click();
  await expect(page.getByText("Next step: forward every call to Tracey")).toBeVisible();
  await expect(page.getByText("Call handling preference saved")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Next step: forward every call to Tracey")).toBeVisible();
});

test("public portal renders the seeded customer job status page", async ({ page }) => {
  const fixture = await readFixtures();
  test.skip(!fixture.dbAvailable, "Seeded portal checks require the isolated Postgres harness.");

  await page.goto(fixture.portalPath);
  await expect(page.getByText("E2E Scheduled Hot Water Fix")).toBeVisible();
  await expect(page.getByText("Status")).toBeVisible();
  await expect(page.getByText("Booked")).toBeVisible();
});
