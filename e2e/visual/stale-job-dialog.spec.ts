import fs from "node:fs/promises";
import path from "node:path";
import { test, expect } from "@playwright/test";

test.use({ storageState: path.join(process.cwd(), "e2e", ".auth", "admin.json") });

async function readFixtures() {
  return JSON.parse(
    await fs.readFile(path.join(process.cwd(), "e2e", ".auth", "fixtures.json"), "utf8"),
  ) as { dbAvailable: boolean };
}

// Regenerate baselines after intentional design changes:
//   npm run test:visual:update
// CI runs `npm run test:visual` which diffs pixels against the checked-in
// snapshots under e2e/visual/__screenshots__/. Baselines must be rendered
// on Linux (where CI runs) — macOS font rendering produces spurious diffs.
test.describe("stale-job reconciliation dialog", () => {
  test.beforeEach(async () => {
    const fixture = await readFixtures();
    test.skip(!fixture.dbAvailable, "Visual tests require the isolated Postgres harness.");
  });

  test("empty state — no outcome selected", async ({ page }) => {
    await page.goto("/crm/jobs");
    const reconcileButton = page.getByRole("button", { name: /reconcile|update overdue|update outcome/i }).first();
    await reconcileButton.waitFor({ state: "visible", timeout: 15000 });
    await reconcileButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("radiogroup", { name: /job outcome/i })).toBeVisible();

    await expect(dialog).toHaveScreenshot("reconcile-dialog-empty.png");
  });

  test("with outcome selected — primary button reflects choice", async ({ page }) => {
    await page.goto("/crm/jobs");
    const reconcileButton = page.getByRole("button", { name: /reconcile|update overdue|update outcome/i }).first();
    await reconcileButton.waitFor({ state: "visible", timeout: 15000 });
    await reconcileButton.click();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("radio", { name: /completed/i }).click();

    await expect(dialog.getByRole("button", { name: /mark completed/i })).toBeVisible();
    await expect(dialog).toHaveScreenshot("reconcile-dialog-completed.png");
  });
});
