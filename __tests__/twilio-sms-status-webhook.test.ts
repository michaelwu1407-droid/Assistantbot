import { describe, it, expect, vi, beforeEach } from "vitest";

const hoisted = vi.hoisted(() => ({
  db: {
    activity: { findFirst: vi.fn(), create: vi.fn() },
    deal: { findUnique: vi.fn() },
    user: { findFirst: vi.fn() },
    notification: { create: vi.fn() },
  },
  verifyTwilioSignature: vi.fn(),
  getTwilioRequestPublicUrl: vi.fn(),
  readTwilioFormParams: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: hoisted.db }));
vi.mock("@/lib/twilio/verify-signature", () => ({
  verifyTwilioSignature: hoisted.verifyTwilioSignature,
  getTwilioRequestPublicUrl: hoisted.getTwilioRequestPublicUrl,
  readTwilioFormParams: hoisted.readTwilioFormParams,
}));

import { POST } from "@/app/api/webhooks/twilio-sms-status/route";

function makeRequest(params: Record<string, string> = {}) {
  return new Request("https://app.earlymark.ai/api/webhooks/twilio-sms-status", {
    method: "POST",
    headers: { "x-twilio-signature": "test-sig" },
  }) as any;
}

const SMS_SID = "SM1234567890abcdef";

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.getTwilioRequestPublicUrl.mockReturnValue("https://app.earlymark.ai/api/webhooks/twilio-sms-status");
  hoisted.verifyTwilioSignature.mockReturnValue({ ok: true });
  hoisted.readTwilioFormParams.mockResolvedValue({
    MessageSid: SMS_SID,
    MessageStatus: "failed",
  });
  hoisted.db.activity.findFirst.mockResolvedValue({
    id: "act_1",
    dealId: "deal_1",
    contactId: "contact_1",
    content: "SMS to Jane: ...",
  });
  hoisted.db.deal.findUnique.mockResolvedValue({
    workspaceId: "ws_1",
    contact: { name: "Jane Smith" },
  });
  hoisted.db.user.findFirst.mockResolvedValue({ id: "user_1" });
  hoisted.db.activity.create.mockResolvedValue({ id: "act_fail_1" });
  hoisted.db.notification.create.mockResolvedValue({ id: "notif_1" });
});

describe("POST /api/webhooks/twilio-sms-status", () => {
  it("returns 403 when Twilio signature is invalid", async () => {
    hoisted.verifyTwilioSignature.mockReturnValue({ ok: false, reason: "invalid_signature" });

    const res = await POST(makeRequest());

    expect(res.status).toBe(403);
    expect(hoisted.db.activity.findFirst).not.toHaveBeenCalled();
  });

  it("returns 200 and does nothing for 'delivered' status", async () => {
    hoisted.readTwilioFormParams.mockResolvedValue({
      MessageSid: SMS_SID,
      MessageStatus: "delivered",
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(hoisted.db.activity.findFirst).not.toHaveBeenCalled();
  });

  it("returns 200 and does nothing for 'sent' status", async () => {
    hoisted.readTwilioFormParams.mockResolvedValue({
      MessageSid: SMS_SID,
      MessageStatus: "sent",
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(hoisted.db.activity.create).not.toHaveBeenCalled();
  });

  it("creates failure Activity and owner Notification on 'failed' status", async () => {
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(hoisted.db.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "SMS delivery failed",
          description: SMS_SID,
          dealId: "deal_1",
          contactId: "contact_1",
        }),
      })
    );
    expect(hoisted.db.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "SMS failed to deliver",
          userId: "user_1",
          type: "ERROR",
          link: "/crm/deals/deal_1",
        }),
      })
    );
  });

  it("creates failure Activity on 'undelivered' status", async () => {
    hoisted.readTwilioFormParams.mockResolvedValue({
      MessageSid: SMS_SID,
      MessageStatus: "undelivered",
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(hoisted.db.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "SMS delivery failed" }),
      })
    );
  });

  it("returns 200 gracefully when no matching Activity found for the MessageSid", async () => {
    hoisted.db.activity.findFirst.mockResolvedValue(null);

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(hoisted.db.activity.create).not.toHaveBeenCalled();
    expect(hoisted.db.notification.create).not.toHaveBeenCalled();
  });

  it("skips notification (but still creates Activity) when no workspace owner found", async () => {
    hoisted.db.user.findFirst.mockResolvedValue(null);

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(hoisted.db.activity.create).toHaveBeenCalled();
    expect(hoisted.db.notification.create).not.toHaveBeenCalled();
  });

  it("returns 200 even when DB throws — does not crash", async () => {
    hoisted.db.activity.findFirst.mockRejectedValue(new Error("DB connection lost"));

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
  });
});
