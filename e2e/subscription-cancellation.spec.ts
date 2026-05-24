import { test, expect } from "@playwright/test";

/**
 * cpl-02 / bill-04 — Subscription cancellation releases Twilio number.
 *
 * Status: 🔴 broken. On customer.subscription.deleted we flip
 * subscriptionStatus but leave twilioPhoneNumber, twilioPhoneNumberSid,
 * twilioSubaccountId on the workspace. We continue paying Twilio
 * carrier rental for an orphaned number on a cancelled workspace.
 *
 * Also covers the bill-06..10 UX gaps: in-app cancel surface, post-
 * cancel banner, grace period through current_period_end.
 *
 * Tracking row: docs/USE_CASE_TEST_MATRIX.md bill-04, bill-06..10,
 * cpl-02.
 */

const STRIPE_WEBHOOK = "/api/webhooks/stripe";

test.describe("Subscription cancellation cleanup", () => {
  test.fixme(true, "Implement bill-04 / cpl-02 before un-skipping");

  test("customer.subscription.deleted schedules Twilio release at period end", async ({
    request,
  }) => {
    // Post a signed Stripe `customer.subscription.deleted` event for a
    // test workspace with an attached Twilio number, then assert:
    //   - workspace.subscriptionStatus === "canceled"
    //   - workspace.stripeCurrentPeriodEnd preserved
    //   - a TwilioReleaseJob row exists scheduled for current_period_end
    //   - twilioPhoneNumber / twilioPhoneNumberSid are NOT cleared yet
    //     (the customer paid for the remainder of the period)
    const res = await request.post(STRIPE_WEBHOOK, {
      headers: { "stripe-signature": "test_signed" },
      data: JSON.stringify({
        id: "evt_e2e_cancel_1",
        type: "customer.subscription.deleted",
        data: { object: { /* …test fixture… */ } },
      }),
    });
    expect(res.status()).toBe(200);
  });

  test("scheduled release runs at period end and clears the Twilio columns", async () => {
    // Simulate the scheduled job firing (Inngest / cron). Assert:
    //   - Twilio API `incomingPhoneNumbers(sid).remove()` was called
    //   - workspace.twilioPhoneNumber === null
    //   - workspace.twilioPhoneNumberSid === null
    //   - workspace.twilioSubaccountId === null
    //   - an Activity row records the release for audit
  });

  test("grace period: cancelled workspace can still access CRM until period end", async ({
    page,
  }) => {
    // Sign in as owner of workspace whose subscriptionStatus=canceled
    // AND stripeCurrentPeriodEnd > now.
    await page.goto("/crm/dashboard");
    await expect(page).toHaveURL(/\/crm\/dashboard/);
    await expect(
      page.getByText(/Your subscription ends on/i),
    ).toBeVisible();
  });

  test("post-period workspace is locked out and lands on a friendly /billing", async ({
    page,
  }) => {
    // Sign in as owner of workspace whose subscriptionStatus=canceled
    // AND stripeCurrentPeriodEnd < now.
    await page.goto("/crm/dashboard");
    await expect(page).toHaveURL(/\/billing/);
    await expect(page.getByText(/Your subscription ended/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Export my data/i }),
    ).toBeVisible();
  });

  test("in-app cancel: confirmation dialog explains what will be lost", async ({
    page,
  }) => {
    await page.goto("/crm/settings/billing");
    await page.getByRole("button", { name: /Cancel subscription/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Your Tracey number will be released/i)).toBeVisible();
    await expect(dialog.getByText(/You can export your data first/i)).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Export my data/i })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Keep my subscription/i })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Cancel anyway/i })).toBeVisible();
  });
});
