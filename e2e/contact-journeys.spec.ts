import { test, expect } from "@playwright/test";

test.describe("public contact journeys", () => {
  test.describe.configure({ mode: "serial" });

  test("contact page explains that adding a phone triggers an immediate callback", async ({ page }) => {
    await page.goto("/contact", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Add your phone if you want Tracey to call you back right away.")).toBeVisible();
  });

  test("contact page tells the user when Tracey is calling now", async ({ page }) => {
    const contactRequests: string[] = [];
    await page.route("**/api/contact", async (route) => {
      contactRequests.push(route.request().method());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, callPlaced: true, callError: null }),
      });
    });

    await page.goto("/contact", { waitUntil: "domcontentloaded" });

    await page.getByLabel("Name").fill("Jane Citizen");
    await page.getByLabel("Email").fill("jane@example.com");
    await page.getByLabel("Phone (optional)").fill("+61400000000");
    await page.getByLabel("Subject").fill("Need help");
    await page.getByLabel("Message").fill("Please call me back.");
    const responsePromise = page.waitForResponse("**/api/contact");
    await page.getByRole("button", { name: /send message/i }).click();
    const response = await responsePromise;
    await expect
      .poll(async () => response.json(), {
        message: "contact API should explicitly tell the UI a callback is happening",
      })
      .toMatchObject({ success: true, callPlaced: true });
    expect(contactRequests).toEqual(["POST"]);

    await expect(page.getByText("Tracey is calling you now")).toBeVisible();
    await expect(page.getByText("Pick up")).toBeVisible();
  });

  test("contact page uses a non-callback success state when only a message is sent", async ({ page }) => {
    await page.route("**/api/contact", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, callPlaced: false, callError: null }),
      });
    });

    await page.goto("/contact", { waitUntil: "domcontentloaded" });

    await page.getByLabel("Name").fill("Jane Citizen");
    await page.getByLabel("Email").fill("jane@example.com");
    await page.getByLabel("Subject").fill("Need pricing");
    await page.getByLabel("Message").fill("Please send details.");
    await page.getByRole("button", { name: /send message/i }).click();

    await expect(page.getByText("Message sent")).toBeVisible();
    await expect(page.getByText("within 24 hours")).toBeVisible();
  });

  test("contact page surfaces friendly server errors", async ({ page }) => {
    await page.route("**/api/contact", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Failed to send message. Please try again or email us directly." }),
      });
    });

    await page.goto("/contact", { waitUntil: "domcontentloaded" });

    await page.getByLabel("Name").fill("Jane Citizen");
    await page.getByLabel("Email").fill("jane@example.com");
    await page.getByLabel("Subject").fill("Need help");
    await page.getByLabel("Message").fill("Please contact me.");
    await page.getByRole("button", { name: /send message/i }).click();

    await expect(page.getByText("Failed to send message. Please try again or email us directly.")).toBeVisible();
  });

  test("pricing page explains the callback option before the user submits", async ({ page }) => {
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Add your phone if you want Tracey to call you back right away.")).toBeVisible();
  });

  test("pricing page tells the user when Tracey is calling now", async ({ page }) => {
    await page.route("**/api/contact", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, callPlaced: true, callError: null }),
      });
    });

    await page.goto("/pricing", { waitUntil: "domcontentloaded" });

    await page.getByLabel("Name").fill("Jane Citizen");
    await page.getByLabel("Email").fill("jane@example.com");
    await page.getByLabel("Phone (optional)").fill("+61400000000");
    await page.getByLabel("Subject").fill("Need pricing");
    await page.getByLabel("Message").fill("Please call me back.");
    await page.getByRole("button", { name: /send message/i }).click();

    await expect(page.getByText("Tracey is calling you now")).toBeVisible();
    await expect(page.getByText("Pick up - Tracey will be on the line in a few seconds.")).toBeVisible();
  });

  test("pricing page keeps the standard message-only success state when no callback is placed", async ({ page }) => {
    await page.route("**/api/contact", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, callPlaced: false, callError: null }),
      });
    });

    await page.goto("/pricing", { waitUntil: "domcontentloaded" });

    await page.getByLabel("Name").fill("Jane Citizen");
    await page.getByLabel("Email").fill("jane@example.com");
    await page.getByLabel("Subject").fill("Need pricing");
    await page.getByLabel("Message").fill("Please send details.");
    await page.getByRole("button", { name: /send message/i }).click();

    await expect(page.getByText("Message sent")).toBeVisible();
    await expect(page.getByText("within 24 hours")).toBeVisible();
  });
});
