import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  db: {
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
});
