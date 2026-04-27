import fs from "node:fs/promises";
import path from "node:path";
import { test, expect } from "@playwright/test";

test.use({ storageState: path.join(process.cwd(), "e2e", ".auth", "admin.json") });

async function readFixtures() {
  return JSON.parse(
    await fs.readFile(path.join(process.cwd(), "e2e", ".auth", "fixtures.json"), "utf8"),
  ) as { dbAvailable: boolean };
}

test("admin can schedule a follow-up reminder from the dashboard deal modal", async ({ page }) => {
  test.setTimeout(120000);
  const fixture = await readFixtures();
  test.skip(!fixture.dbAvailable, "CRM Playwright tests require the isolated Postgres harness.");

  await page.goto("/crm/dashboard");
  await expect(page.getByRole("button", { name: "Chat" })).toBeVisible();
  await page.getByRole("button", { name: "Advanced" }).click();

  const leadCard = page.locator('[data-kanban-card="true"]').filter({ hasText: "E2E Lead Leak Quote" }).first();
  await expect(leadCard).toBeVisible({ timeout: 15000 });
  await leadCard.click();

  const dealDialog = page.getByRole("dialog", { name: "Deal details" });
  await expect(dealDialog).toBeVisible();
  await expect(dealDialog.getByText("Loading...")).toBeVisible({ timeout: 15000 });
  await expect(dealDialog.getByText("Loading...")).toBeHidden({ timeout: 20000 });
  await expect(dealDialog.locator("h1").getByText("E2E Lead Leak Quote")).toBeVisible({ timeout: 15000 });

  const scheduleFollowUpButton = dealDialog.getByRole("button", { name: /Schedule a follow-up reminder/i });
  const removeFollowUpButton = dealDialog.getByRole("button", { name: "Remove" });
  const scheduleAnotherButton = dealDialog.getByRole("button", { name: /Schedule another/i });

  if (await removeFollowUpButton.isVisible()) {
    await removeFollowUpButton.click();
    await expect(scheduleFollowUpButton).toBeVisible({ timeout: 15000 });
  } else if (await scheduleAnotherButton.isVisible()) {
    await scheduleAnotherButton.click();
  } else {
    await expect(scheduleFollowUpButton).toBeVisible({ timeout: 15000 });
  }

  await scheduleFollowUpButton.click();
  await dealDialog.locator('input[type="datetime-local"]').fill("2026-05-05T10:15");
  await dealDialog.getByPlaceholder("What to follow up about...").fill("Check whether the quote has been approved.");
  await dealDialog.getByRole("button", { name: "Save Reminder" }).click();

  await expect(page.getByText("Follow-up reminder saved")).toBeVisible();
  await expect(dealDialog.getByText("Check whether the quote has been approved.")).toBeVisible();
  await expect(dealDialog.getByRole("button", { name: "Remove" })).toBeVisible();
  await expect(dealDialog.getByRole("button", { name: /Done/i })).toBeVisible();
});
