import fs from "node:fs/promises";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { E2E_IDS } from "./constants";

test.use({ storageState: path.join(process.cwd(), "e2e", ".auth", "admin.json") });

async function readFixtures() {
  return JSON.parse(
    await fs.readFile(path.join(process.cwd(), "e2e", ".auth", "fixtures.json"), "utf8"),
  ) as { dbAvailable: boolean };
}

test("inbox guides the operator when a contact has email but no phone", async ({ page }) => {
  test.setTimeout(120000);
  const fixture = await readFixtures();
  test.skip(!fixture.dbAvailable, "CRM Playwright tests require the isolated Postgres harness.");

  await page.goto(`/crm/inbox?contact=${E2E_IDS.emailOnlyContactId}`);

  const traceyTab = page.getByRole("tab", { name: /Ask Tracey/i });
  const directTab = page.getByRole("tab", { name: /Direct SMS/i });

  await expect(page.getByRole("heading", { name: "E2E Email Only Contact" })).toBeVisible({ timeout: 15000 });
  await expect(traceyTab).toHaveAttribute("aria-selected", "true");
  await expect(directTab).toHaveAttribute("aria-disabled", "true");
  await expect(
    page.getByText(/This contact has no phone number, so direct SMS is unavailable\. Ask Tracey can still update the CRM or draft the next step\./i),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Add phone in CRM/i })).toHaveAttribute(
    "href",
    `/crm/contacts/${E2E_IDS.emailOnlyContactId}/edit`,
  );
  await expect(
    page.getByRole("textbox", { name: /Ask Tracey to reply or update the CRM for E2E Email Only Contact/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Ask Tracey to act/i })).toBeVisible();
});

test("inbox keeps direct SMS usable while surfacing missing email recovery", async ({ page }) => {
  test.setTimeout(120000);
  const fixture = await readFixtures();
  test.skip(!fixture.dbAvailable, "CRM Playwright tests require the isolated Postgres harness.");

  await page.goto(`/crm/inbox?contact=${E2E_IDS.phoneOnlyContactId}`);

  const directTab = page.getByRole("tab", { name: /Direct SMS/i });
  const directTextbox = page.getByRole("textbox", { name: /Send an SMS to E2E Phone Only Contact yourself/i });

  await expect(page.getByRole("heading", { name: "E2E Phone Only Contact" })).toBeVisible({ timeout: 15000 });
  await expect(directTab).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByText(/No email address is on file yet, so email follow-up is unavailable from this customer timeline\./i),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Add email in CRM/i })).toHaveAttribute(
    "href",
    `/crm/contacts/${E2E_IDS.phoneOnlyContactId}/edit`,
  );
  await expect(directTextbox).toBeVisible();
  await directTextbox.fill("We can text you an arrival window shortly.");
  await expect(page.getByText("42/160 characters")).toBeVisible();
  await expect(page.getByRole("button", { name: /Send now/i })).toBeVisible();
});

test("deal page gives a clear recovery path when calling or texting is blocked by missing phone", async ({ page }) => {
  test.setTimeout(120000);
  const fixture = await readFixtures();
  test.skip(!fixture.dbAvailable, "CRM Playwright tests require the isolated Postgres harness.");

  await page.goto(`/crm/deals/${E2E_IDS.emailOnlyDealId}`);

  await expect(page.getByRole("heading", { name: "E2E Email Only Repair Quote" })).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByText(/No phone number on file\. Add one in CRM before calling or texting from this job\./i),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Add phone in CRM/i })).toHaveAttribute(
    "href",
    `/crm/contacts/${E2E_IDS.emailOnlyContactId}/edit`,
  );
  await expect(page.getByRole("link", { name: /Open customer timeline/i })).toHaveAttribute(
    "href",
    `/crm/inbox?contact=${E2E_IDS.emailOnlyContactId}`,
  );
});
