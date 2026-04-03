import { test, expect } from "@playwright/test";

test("marketing landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
});

test("portal preview page loads its customer-facing status UI", async ({ page }) => {
  await page.goto("/portal-preview");
  await expect(page.getByRole("heading", { name: "Your appointment" })).toBeVisible();
  await expect(page.getByText("Status").first()).toBeVisible();
});
