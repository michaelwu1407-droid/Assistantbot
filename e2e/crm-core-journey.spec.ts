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

test("admin can move from lead row to contact detail to deal detail to timeline without losing context", async ({
  page,
}) => {
  test.setTimeout(120000);
  const fixture = await readFixtures();
  test.skip(!fixture.dbAvailable, "CRM Playwright tests require the isolated Postgres harness.");

  await page.goto("/crm/contacts");

  const leadLink = page.getByRole("link", { name: "E2E Lead Contact" });
  await expect(leadLink).toBeVisible();
  const leadRow = leadLink.locator("xpath=ancestor::tr[1]");
  await expect(leadRow.getByText("E2E Lead Leak Quote")).toBeVisible();
  await expect(leadRow.getByText(/New request/i)).toBeVisible();
  await expect(leadRow.getByTitle("Call")).toHaveAttribute("href", "tel:+61430000001");
  await expect(leadRow.getByTitle("Text")).toHaveAttribute("href", "sms:+61430000001");
  await expect(leadRow.getByTitle("Email")).toHaveAttribute("href", "mailto:lead+e2e@example.com");
  await expect(leadLink).toHaveAttribute("href", `/crm/contacts/${E2E_IDS.leadContactId}`);
  await Promise.all([
    page.waitForURL(new RegExp(`/crm/contacts/${E2E_IDS.leadContactId}$`)),
    leadLink.click(),
  ]);
  await expect(page).toHaveURL(new RegExp(`/crm/contacts/${E2E_IDS.leadContactId}$`));
  await expect(page.getByRole("heading", { name: "E2E Lead Contact" })).toBeVisible();
  await expect(page.getByText("Current job")).toBeVisible();
  await expect(page.getByText("E2E Lead Leak Quote")).toBeVisible();
  await expect(
    page.getByText("Recent notes and jobs stay on this page. Open the customer timeline for the full SMS, email, and call correspondence."),
  ).toBeVisible();

  const openJobLink = page.getByRole("link", { name: "Open job" });
  await expect(openJobLink).toHaveAttribute("href", `/crm/deals/${E2E_IDS.leadDealId}`);
  await Promise.all([
    page.waitForURL(new RegExp(`/crm/deals/${E2E_IDS.leadDealId}$`)),
    openJobLink.click(),
  ]);
  await expect(page).toHaveURL(new RegExp(`/crm/deals/${E2E_IDS.leadDealId}$`));
  await expect(page.getByRole("heading", { name: "E2E Lead Leak Quote" })).toBeVisible();
  await expect(page.getByText("Current job")).toBeVisible();
  await expect(page.getByText("Customer & job history")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open customer timeline" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Call client" })).toHaveAttribute("href", "tel:+61430000001");
  await expect(page.getByRole("link", { name: "Text client" })).toHaveAttribute("href", "sms:+61430000001");

  const timelineLink = page.getByRole("link", { name: "Open customer timeline" });
  await expect(timelineLink).toHaveAttribute(
    "href",
    `/crm/inbox?contact=${E2E_IDS.leadContactId}`,
  );
  await Promise.all([
    page.waitForURL(new RegExp(`/crm/inbox\\?contact=${E2E_IDS.leadContactId}$`)),
    timelineLink.click(),
  ]);
  await expect(page).toHaveURL(new RegExp(`/crm/inbox\\?contact=${E2E_IDS.leadContactId}$`));
  await expect(page.getByRole("textbox", { name: /Send an SMS to E2E Lead Contact yourself/i })).toBeVisible();
});
