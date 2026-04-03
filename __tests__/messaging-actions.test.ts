import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  db: {
    workspace: {
      findUnique: vi.fn(),
    },
    contact: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
    deal: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  buildPublicFeedbackUrl: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: hoisted.db }));
vi.mock("@/lib/public-feedback", () => ({
  buildPublicFeedbackUrl: hoisted.buildPublicFeedbackUrl,
}));

import { sendConfirmationSMS, sendRescheduleConfirmationSMS, sendSMS } from "@/actions/messaging-actions";

describe("messaging-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("TWILIO_AUTH_TOKEN", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ sid: "SM123" }),
      }),
    );
    hoisted.db.workspace.findUnique.mockResolvedValue({
      twilioSubaccountId: "ACsub123",
      twilioPhoneNumber: "+61400000000",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends SMS with workspace Twilio credentials and logs the activity", async () => {
    hoisted.db.contact.findUnique.mockResolvedValue({
      id: "contact_1",
      name: "Alex",
      phone: "0400000000",
      workspaceId: "ws_1",
    });

    const result = await sendSMS("contact_1", "Your booking is confirmed.", "deal_1");

    expect(result).toEqual({
      success: true,
      messageId: "SM123",
      channel: "sms",
      error: undefined,
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.twilio.com/2010-04-01/Accounts/ACsub123/Messages.json",
      expect.objectContaining({
        method: "POST",
        body: expect.any(URLSearchParams),
      }),
    );
    const request = vi.mocked(fetch).mock.calls[0]?.[1];
    expect(String(request?.body)).toContain("To=0400000000");
    expect(String(request?.body)).toContain("From=%2B61400000000");
    expect(hoisted.db.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "SMS sent",
        contactId: "contact_1",
        dealId: "deal_1",
      }),
    });
  });

  it("sends confirmation SMS, stores pending confirmation metadata, and logs the follow-up note", async () => {
    hoisted.db.deal.findUnique.mockResolvedValue({
      id: "deal_1",
      title: "Hot Water Fix",
      scheduledAt: new Date("2026-04-02T09:00:00.000Z"),
      address: "12 King St",
      workspaceId: "ws_1",
      contactId: "contact_1",
      metadata: { existing: true },
      contact: {
        id: "contact_1",
        name: "Alex",
        phone: "0400000000",
      },
    });
    hoisted.db.contact.findUnique.mockResolvedValue({
      id: "contact_1",
      name: "Alex",
      phone: "0400000000",
      workspaceId: "ws_1",
    });

    const result = await sendConfirmationSMS("deal_1");

    expect(result.success).toBe(true);
    expect(hoisted.db.deal.update).toHaveBeenCalledWith({
      where: { id: "deal_1" },
      data: {
        metadata: expect.objectContaining({
          existing: true,
          confirmationSent: expect.any(String),
          confirmationStatus: "pending",
        }),
      },
    });
    expect(hoisted.db.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Confirmation SMS Sent",
        dealId: "deal_1",
        contactId: "contact_1",
      }),
    });
  });

  it("sends reschedule confirmation SMS and logs the updated booking note", async () => {
    hoisted.db.deal.findUnique.mockResolvedValue({
      id: "deal_1",
      title: "Hot Water Fix",
      scheduledAt: new Date("2026-04-03T11:30:00.000Z"),
      address: "12 King St",
      workspaceId: "ws_1",
      contactId: "contact_1",
      metadata: { existing: true, confirmationSent: "2026-04-01T01:00:00.000Z" },
      contact: {
        id: "contact_1",
        name: "Alex",
        phone: "0400000000",
      },
    });
    hoisted.db.contact.findUnique.mockResolvedValue({
      id: "contact_1",
      name: "Alex",
      phone: "0400000000",
      workspaceId: "ws_1",
    });

    const result = await sendRescheduleConfirmationSMS("deal_1");

    expect(result.success).toBe(true);
    expect(hoisted.db.deal.update).toHaveBeenCalledWith({
      where: { id: "deal_1" },
      data: {
        metadata: expect.objectContaining({
          existing: true,
          confirmationSent: "2026-04-01T01:00:00.000Z",
          rescheduleConfirmationSent: expect.any(String),
          confirmationStatus: "pending",
        }),
      },
    });
    expect(hoisted.db.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Reschedule confirmation SMS sent",
        dealId: "deal_1",
        contactId: "contact_1",
      }),
    });
  });
});
