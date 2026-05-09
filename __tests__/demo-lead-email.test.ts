import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  send: vi.fn(),
  assertSafeRecipient: vi.fn(),
  withCostCeiling: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: hoisted.send,
    };
  },
}));

vi.mock("@/lib/messaging/safe-recipient", () => ({
  assertSafeRecipient: hoisted.assertSafeRecipient,
}));

vi.mock("@/lib/cost-ceiling", () => ({
  withCostCeiling: hoisted.withCostCeiling,
}));

import { sendDemoLeadNotificationEmail } from "@/lib/demo-lead-email";

describe("sendDemoLeadNotificationEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "resend_test";
    process.env.RESEND_FROM_DOMAIN = "earlymark.ai";
    delete process.env.SALES_EMAIL_TO;

    hoisted.assertSafeRecipient.mockImplementation((_kind: string, target: string) => target);
    hoisted.withCostCeiling.mockImplementation(async (_provider: string, _cost: number, fn: () => Promise<unknown>) => {
      return await fn();
    });
    hoisted.send.mockResolvedValue({ data: { id: "email_123" }, error: null });
  });

  it("sends the demo lead email to sales with the lead details", async () => {
    const result = await sendDemoLeadNotificationEmail({
      leadId: "lead_123",
      source: "homepage_form",
      firstName: "Michael",
      lastName: "Wu",
      phone: "+61434955958",
      email: "michael@example.com",
      businessName: "Alexandria Auto",
      callStatus: "initiated",
      roomName: "demo-1",
      resolvedTrunkId: "ST_real",
      callerNumber: "+61485010634",
      warnings: [],
    });

    expect(result).toEqual({ sent: true, skipped: false });
    expect(hoisted.assertSafeRecipient).toHaveBeenCalledWith("email", "sales@earlymark.ai");
    expect(hoisted.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("Michael Wu"),
        to: ["sales@earlymark.ai"],
        replyTo: "michael@example.com",
        text: expect.stringContaining("Business: Alexandria Auto"),
        html: expect.stringContaining("New Tracey demo lead"),
      }),
    );
  });

  it("skips cleanly when resend is not configured", async () => {
    delete process.env.RESEND_API_KEY;

    const result = await sendDemoLeadNotificationEmail({
      leadId: "lead_123",
      source: "homepage_form",
      firstName: "Michael",
      phone: "+61434955958",
      callStatus: "failed",
    });

    expect(result).toEqual({
      sent: false,
      skipped: true,
      reason: "RESEND_API_KEY missing",
    });
    expect(hoisted.send).not.toHaveBeenCalled();
  });
});
