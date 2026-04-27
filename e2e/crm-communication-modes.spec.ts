import fs from "node:fs/promises";
import path from "node:path";
import { test, expect } from "@playwright/test";

test.use({ storageState: path.join(process.cwd(), "e2e", ".auth", "admin.json") });

async function readFixtures() {
  return JSON.parse(
    await fs.readFile(path.join(process.cwd(), "e2e", ".auth", "fixtures.json"), "utf8"),
  ) as { dbAvailable: boolean };
}

test("admin can clearly distinguish direct SMS from Ask Tracey in the inbox", async ({ page }) => {
  test.setTimeout(120000);
  const fixture = await readFixtures();
  test.skip(!fixture.dbAvailable, "CRM Playwright tests require the isolated Postgres harness.");

  await page.goto("/crm/inbox?contact=e2e_contact_lead");

  await expect(
    page.getByRole("textbox", { name: /Send an SMS to E2E Lead Contact yourself/i }),
  ).toBeVisible({ timeout: 15000 });

  const directTab = page.getByRole("tab", { name: /Direct SMS/i });
  const traceyTab = page.getByRole("tab", { name: /Ask Tracey/i });

  await expect(directTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText(/Direct SMS: sends now from your workspace Twilio number/i)).toBeVisible();
  await expect(page.getByText(/Not AI.*only the exact characters you type below are sent\./i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Send now/i })).toBeVisible();
  await expect(page.getByText("0/160 characters")).toBeVisible();

  const directTextbox = page.getByRole("textbox", { name: /Send an SMS to E2E Lead Contact yourself/i });
  await directTextbox.fill("Running 10 minutes late");
  await expect(page.getByText("23/160 characters")).toBeVisible();

  await traceyTab.click();
  await expect(traceyTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText(/Ask Tracey: the AI reads your instruction and may reply to the customer or update the CRM\./i)).toBeVisible();
  await expect(page.getByText(/Not a raw SMS.*Tracey decides how to act/i)).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: /Ask Tracey to reply or update the CRM for E2E Lead Contact/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Ask Tracey to act/i })).toBeVisible();

  const traceyTextbox = page.getByRole("textbox", { name: /Ask Tracey to reply or update the CRM for E2E Lead Contact/i });
  await traceyTextbox.fill("Send a friendly check-in and note the customer is still waiting on approval.");
  await expect(page.getByText(/Tracey stays in orchestration mode here/i)).toBeVisible();

  await directTab.click();
  await expect(directTextbox).toHaveValue("Running 10 minutes late");

  await traceyTab.click();
  await expect(traceyTextbox).toHaveValue("Send a friendly check-in and note the customer is still waiting on approval.");
});
