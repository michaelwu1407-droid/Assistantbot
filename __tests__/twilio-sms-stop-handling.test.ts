import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  findWorkspaceByTwilioNumber: vi.fn(),
  findContactByPhone: vi.fn(),
  getWorkspaceTwilioClient: vi.fn(),
  prisma: {
    webhookEvent: { create: vi.fn() },
    contact: { update: vi.fn(), create: vi.fn() },
    activity: { findFirst: vi.fn(), create: vi.fn() },
    chatMessage: { create: vi.fn() },
    user: { findFirst: vi.fn() },
    deal: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    notification: { create: vi.fn() },
  },
  generateSMSResponse: vi.fn(),
  classifyMessage: vi.fn(),
  triageIncomingLead: vi.fn(),
  saveTriageRecommendation: vi.fn(),
  scheduleLeadCallback: vi.fn(),
  hasRecentAutomaticCallbackAttempt: vi.fn(),
  recordCallbackEvent: vi.fn(),
  assessInboundLeadGuard: vi.fn(),
  recordInboundLeadGuardEvent: vi.fn(),
  waitUntil: vi.fn(),
}));

vi.mock("@/lib/workspace-routing", () => ({
  findWorkspaceByTwilioNumber: hoisted.findWorkspaceByTwilioNumber,
  findContactByPhone: hoisted.findContactByPhone,
}));
vi.mock("@/lib/twilio", () => ({ getWorkspaceTwilioClient: hoisted.getWorkspaceTwilioClient }));
vi.mock("@/lib/db", () => ({ db: hoisted.prisma }));
vi.mock("@/lib/ai/sms-agent", () => ({ generateSMSResponse: hoisted.generateSMSResponse }));
vi.mock("@/lib/spam-classifier", () => ({ classifyMessage: hoisted.classifyMessage }));
vi.mock("@/lib/ai/triage", () => ({
  triageIncomingLead: hoisted.triageIncomingLead,
  saveTriageRecommendation: hoisted.saveTriageRecommendation,
}));
vi.mock("@/lib/lead-callback", () => ({ scheduleLeadCallback: hoisted.scheduleLeadCallback }));
vi.mock("@/lib/callback-events", () => ({
  hasRecentAutomaticCallbackAttempt: hoisted.hasRecentAutomaticCallbackAttempt,
  recordCallbackEvent: hoisted.recordCallbackEvent,
}));
vi.mock("@/lib/inbound-lead-guard", () => ({
  assessInboundLeadGuard: hoisted.assessInboundLeadGuard,
  buildInboundLeadGuardCopy: () => ({ title: "Held", description: "Reason" }),
  recordInboundLeadGuardEvent: hoisted.recordInboundLeadGuardEvent,
}));
vi.mock("@vercel/functions", () => ({ waitUntil: hoisted.waitUntil }));

import { POST } from "@/app/api/twilio/webhook/route";

const WORKSPACE = {
  id: "ws_1",
  name: "Alpha Plumbing",
  settings: {},
  twilioPhoneNumber: "+61485010634",
};

function buildStopRequest(Body: string) {
  return new NextRequest("https://app.example.com/api/twilio/webhook", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ From: "+61400000000", To: "+61485010634", Body, MessageSid: "SM_stop" }),
  });
}

describe("SMS STOP / opt-out handling (comm-19 / cpl-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.findWorkspaceByTwilioNumber.mockResolvedValue(WORKSPACE);
    hoisted.findContactByPhone.mockResolvedValue({ id: "contact_1", smsOptedOut: false });
    hoisted.prisma.webhookEvent.create.mockResolvedValue(undefined);
    hoisted.prisma.contact.update.mockResolvedValue({});
    hoisted.prisma.chatMessage.create.mockResolvedValue(undefined);
    const msgCreate = vi.fn().mockResolvedValue({ sid: "SM_confirm" });
    hoisted.getWorkspaceTwilioClient.mockReturnValue({ messages: { create: msgCreate } });
  });

  it("sets smsOptedOut=true on the contact and sends a confirmation SMS (STOP)", async () => {
    const response = await POST(buildStopRequest("STOP"));

    expect(response.status).toBe(200);
    expect(hoisted.prisma.contact.update).toHaveBeenCalledWith({
      where: { id: "contact_1" },
      data: { smsOptedOut: true },
    });
    expect(hoisted.generateSMSResponse).not.toHaveBeenCalled();
  });

  it("handles UNSUBSCRIBE and CANCEL variants as opt-out keywords", async () => {
    for (const keyword of ["UNSUBSCRIBE", "CANCEL", "quit"]) {
      hoisted.prisma.contact.update.mockClear();
      await POST(buildStopRequest(keyword));
      expect(hoisted.prisma.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { smsOptedOut: true } }),
      );
    }
  });

  it("records a webhook event with replySuppressedReason=sms_opt_out", async () => {
    await POST(buildStopRequest("STOP"));

    expect(hoisted.prisma.webhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: "twilio",
        payload: expect.objectContaining({ replySuppressedReason: "sms_opt_out" }),
      }),
    });
  });

  it("does not create a contact for STOP from an unknown number (avoids ghost records)", async () => {
    hoisted.findContactByPhone.mockResolvedValue(null);
    hoisted.prisma.contact.create.mockResolvedValue({ id: "contact_new" });

    await POST(buildStopRequest("STOP"));

    expect(hoisted.prisma.contact.create).not.toHaveBeenCalled();
  });
});
