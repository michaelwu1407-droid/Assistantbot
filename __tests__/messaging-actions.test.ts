import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  db: {
    contact: {
      findUnique: vi.fn(),
    },
    deal: {
      findUnique: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
    workspace: {
      findUnique: vi.fn(),
    },
    webhookEvent: {
      create: vi.fn(),
    },
  },
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: hoisted.db,
}));

vi.mock("@/lib/public-feedback", () => ({
  buildPublicFeedbackUrl: vi.fn(() => "https://www.earlymark.ai/feedback/test-token"),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: hoisted.sendEmail,
    };
  },
}));

describe("messaging-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RESEND_API_KEY", "resend_test_key");
    vi.stubEnv("RESEND_FROM_DOMAIN", "earlymark.ai");
    hoisted.db.activity.create.mockResolvedValue({ id: "activity_1" });
    hoisted.db.webhookEvent.create.mockResolvedValue({ id: "webhook_1" });
    hoisted.sendEmail.mockResolvedValue({ data: { id: "email_1" }, error: null });
  });

  it("falls back to email review requests when the contact has no phone number", async () => {
    hoisted.db.deal.findUnique.mockResolvedValue({
      id: "deal_1",
      contactId: "contact_1",
      workspaceId: "ws_1",
      contact: {
        name: "Alex Harper",
        phone: null,
        email: "alex@customer.com",
      },
      workspace: {
        name: "Friendly Plumbing",
      },
    });

    const { sendReviewRequestSMS } = await import("@/actions/messaging-actions");
    const result = await sendReviewRequestSMS("deal_1");

    expect(result).toEqual({
      success: true,
      channel: "email",
      messageId: "email_1",
    });
    expect(hoisted.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["alex@customer.com"],
        subject: "We'd love your feedback on your recent job",
      }),
    );
  });

  describe("sendViaTwilio audit trail", () => {
    beforeEach(() => {
      vi.stubEnv("TWILIO_AUTH_TOKEN", "auth_token_x");
      hoisted.db.workspace.findUnique.mockResolvedValue({
        twilioSubaccountId: "AC_workspace",
        twilioPhoneNumber: "+61400000000",
      });
      hoisted.db.contact.findUnique.mockResolvedValue({
        id: "contact_1",
        name: "Alex",
        phone: "+61434955958",
        workspaceId: "ws_1",
      });
    });

    it("surfaces audit-trail write failures via console.error instead of swallowing them", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ sid: "SM_123" }), { status: 200 }),
      );
      hoisted.db.webhookEvent.create.mockRejectedValueOnce(new Error("DB down"));

      const { sendSMS } = await import("@/actions/messaging-actions");
      const result = await sendSMS("contact_1", "hi");

      expect(result.success).toBe(true);
      expect(hoisted.db.webhookEvent.create).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("safeRecordWebhookEvent"),
        expect.anything(),
      );

      fetchSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it("awaits the audit write rather than firing-and-forgetting it", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ sid: "SM_456" }), { status: 200 }),
      );
      let resolveWrite: () => void = () => {};
      const writePromise = new Promise<{ id: string }>((resolve) => {
        resolveWrite = () => resolve({ id: "webhook_1" });
      });
      hoisted.db.webhookEvent.create.mockReturnValueOnce(writePromise);

      const { sendSMS } = await import("@/actions/messaging-actions");
      let resolved = false;
      const callPromise = sendSMS("contact_1", "hi").then(() => {
        resolved = true;
      });

      await Promise.resolve();
      await Promise.resolve();
      expect(resolved).toBe(false);

      resolveWrite();
      await callPromise;
      expect(resolved).toBe(true);

      fetchSpy.mockRestore();
    });
  });
});
