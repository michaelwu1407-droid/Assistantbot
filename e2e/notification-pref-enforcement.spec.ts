import { test, expect } from "@playwright/test";
import path from "node:path";

/**
 * notif-01..03 / cpl-03..05 — Email notification preferences are
 * enforced end-to-end, not just persisted.
 *
 * Status: 🟡 partial. Toggles save to workspace.settings, but no
 * email-sending code reads the prefs back. These specs prove that the
 * consumer side actually respects the toggle.
 *
 * Tracking row: docs/USE_CASE_TEST_MATRIX.md notif-01, notif-02,
 * notif-03 (cpl-03..05 mirror them).
 */

test.use({ storageState: path.join(process.cwd(), "e2e", ".auth", "admin.json") });

test.describe("Email notification preference enforcement", () => {
  test("disabling 'Deal updates' suppresses the email on next deal update", async ({
    page,
    request,
  }) => {
    test.fixme(true, "Needs deal-update action to be triggered via API in E2E");
    await page.goto("/crm/settings/notifications");
    const toggle = page.getByRole("switch", { name: /Deal updates/i });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");

    // Trigger a deal update that would normally send an email.
    // After fix: assert NO entry in the email outbox (Resend test mode
    // exposed via /api/test/inspect/email-outbox).
    const outbox = await request.get("/api/test/inspect/email-outbox");
    expect(outbox.status()).toBe(200);
    const body = (await outbox.json()) as { sent: Array<{ template: string }> };
    expect(body.sent.find((m) => m.template === "deal-update")).toBeUndefined();
  });

  test("disabling 'New contacts' suppresses the email on next contact create", async ({
    page,
    request,
  }) => {
    test.fixme(true, "Needs contact-create action to be triggered via API in E2E");
    await page.goto("/crm/settings/notifications");
    await page.getByRole("switch", { name: /New contacts/i }).click();

    // Create a contact via the API and assert no contact-created email.
    const outbox = await request.get("/api/test/inspect/email-outbox");
    const body = (await outbox.json()) as { sent: Array<{ template: string }> };
    expect(body.sent.find((m) => m.template === "contact-created")).toBeUndefined();
  });

  test("disabling 'Weekly summary' makes the digest job skip the workspace", async ({
    page,
    request,
  }) => {
    test.fixme(true, "Needs workspaceId seeded in E2E fixture before enabling");
    await page.goto("/crm/settings/notifications");
    await page.getByRole("switch", { name: /Weekly summary/i }).click();

    // Trigger the digest job and assert the workspace was skipped.
    await request.post("/api/test/trigger/weekly-digest");
    const outbox = await request.get("/api/test/inspect/email-outbox");
    const body = (await outbox.json()) as { sent: Array<{ template: string; workspaceId: string }> };
    expect(
      body.sent.find((m) => m.template === "weekly-digest" && m.workspaceId === "e2e_workspace_crm"),
    ).toBeUndefined();
  });

  test("toggle survives reload (sanity — pref actually persists)", async ({ page }) => {
    await page.goto("/crm/settings/notifications");
    const toggle = page.getByRole("switch", { name: /Deal updates/i });
    const stateBefore = await toggle.getAttribute("aria-checked");
    await toggle.click();
    await page.reload();
    const stateAfter = await page
      .getByRole("switch", { name: /Deal updates/i })
      .getAttribute("aria-checked");
    expect(stateAfter).not.toBe(stateBefore);
  });
});
