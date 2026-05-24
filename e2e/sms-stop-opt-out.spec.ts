import { test, expect } from "@playwright/test";

/**
 * cpl-01 / lead-05 — Customer SMS STOP opt-out.
 *
 * Status: 🔴 broken in production. Twilio webhook still triggers the AI
 * reply for STOP messages and there is no Contact.smsOptedOut flag.
 *
 * These specs are written as the acceptance contract for the fix. They
 * are marked .fixme until the implementation lands so CI surfaces the
 * outstanding work without blocking merges.
 *
 * Tracking row: docs/USE_CASE_TEST_MATRIX.md cpl-01, lead-05.
 */

const TWILIO_WEBHOOK = "/api/twilio/webhook";

async function postTwilioInbound(
  request: import("@playwright/test").APIRequestContext,
  params: Record<string, string>,
) {
  const body = new URLSearchParams(params).toString();
  return request.post(TWILIO_WEBHOOK, {
    headers: { "content-type": "application/x-www-form-urlencoded" },
    data: body,
  });
}

test.describe("Customer SMS STOP is honoured end-to-end", () => {
  test.fixme(true, "Implement cpl-01 / lead-05 before un-skipping");

  test("inbound STOP sets the opt-out flag and does not generate an AI reply", async ({
    request,
  }) => {
    const res = await postTwilioInbound(request, {
      From: "+61400000111",
      To: "+61400000999",
      Body: "STOP",
      MessageSid: "SM_e2e_stop_1",
    });
    expect(res.status()).toBe(200);

    // After implementation we expect:
    //   - Contact.smsOptedOut = true
    //   - exactly one webhookEvent of type sms.received
    //   - zero webhookEvent of type sms.reply with autoRespondEnabled=true
    //   - one outbound confirmation SMS via Twilio: "You've been unsubscribed..."
    // Wire those assertions via a /api/test/inspect endpoint exposed only
    // when E2E_AUTH_ENABLED=1, then assert on the JSON shape here.
  });

  test("subsequent outbound send to opted-out contact is blocked at app layer", async ({
    request,
  }) => {
    await postTwilioInbound(request, {
      From: "+61400000222",
      To: "+61400000999",
      Body: "UNSUBSCRIBE",
      MessageSid: "SM_e2e_unsub_1",
    });

    // Outbound send via tradie composer / automation should:
    //   - throw a typed error from lib/messaging/safe-recipient.ts
    //   - leave Activity record with status=blocked, reason=opted_out
    //   - surface a clear toast on the operator side
  });

  test("STOP from a brand-new sender does NOT create a Deal or Contact name 'Unknown Sender'", async ({
    request,
  }) => {
    await postTwilioInbound(request, {
      From: "+61400000333",
      To: "+61400000999",
      Body: "stop",
      MessageSid: "SM_e2e_stop_lowercase",
    });

    // Currently the webhook unconditionally creates a Contact at line
    // 142 even for STOP. After fix: skip Contact create if Body matches
    // the opt-out vocabulary AND no existing contact for the sender.
  });

  test("CONFIRM and STOP must not collide — CONFIRM still confirms a pending deal", async ({
    request,
  }) => {
    // Regression guard: the opt-out fast-path must run BEFORE the
    // booking-confirmation fast-path AND must not swallow "CONFIRM".
    await postTwilioInbound(request, {
      From: "+61400000444",
      To: "+61400000999",
      Body: "CONFIRM",
      MessageSid: "SM_e2e_confirm_after_stop",
    });
  });
});
