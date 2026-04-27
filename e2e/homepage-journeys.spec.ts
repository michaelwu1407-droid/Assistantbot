import { expect, test } from "@playwright/test";

test.describe("homepage Interview Tracey journey", () => {
  test("sets the callback expectation clearly before the user submits", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: /interview tracey for free/i })).toBeVisible();
    await expect(page.getByPlaceholder("First name")).toBeVisible();
    await expect(page.getByPlaceholder("Last name")).toBeVisible();
    await expect(page.getByPlaceholder("Phone number")).toBeVisible();
    await expect(page.getByPlaceholder("Email address")).toBeVisible();
    await expect(page.getByPlaceholder("Business name")).toBeVisible();
    await expect(page.getByText("Tracey will call you within seconds. No credit card required.")).toBeVisible();
    await expect(page.getByRole("button", { name: /interview tracey for free/i })).toBeVisible();
  });
});
