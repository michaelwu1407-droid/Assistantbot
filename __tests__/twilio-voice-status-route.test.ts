import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  db,
  findWorkspaceByTwilioNumber,
  findContactByPhone,
  scheduleLeadCallback,
  hasRecentAutomaticCallbackAttempt,
  recordCallbackEvent,
  assessInboundLeadGuard,
  recordInboundLeadGuardEvent,
  runIdempotent,
} = vi.hoisted(() => ({
  db: {
    contact: { create: vi.fn() },
    deal: { create: vi.fn() },
    activity: { create: vi.fn() },
    webhookEvent: { findFirst: vi.fn(), create: vi.fn() },
  },
  findWorkspaceByTwilioNumber: vi.fn(),
  findContactByPhone: vi.fn(),
  scheduleLeadCallback: vi.fn(),
  hasRecentAutomaticCallbackAttempt: vi.fn(),
  recordCallbackEvent: vi.fn(),
  assessInboundLeadGuard: vi.fn(),
  recordInboundLeadGuardEvent: vi.fn(),
  runIdempotent: vi.fn(),
}));

vi.mock("@/lib/idempotency", () => ({ runIdempotent }));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/workspace-routing", () => ({
  findWorkspaceByTwilioNumber,
  findContactByPhone,
}));
vi.mock("@/lib/lead-callback", () => ({ scheduleLeadCallback }));
vi.mock("@/lib/callback-events", () => ({
  hasRecentAutomaticCallbackAttempt,
  recordCallbackEvent,
}));
vi.mock("@/lib/inbound-lead-guard", () => ({
  assessInboundLeadGuard,
  buildInboundLeadGuardCopy: ({ reason }: { reason: string }) => ({
    title: "Lead held for spam review",
    description: `Held because ${reason}`,
  }),
  recordInboundLeadGuardEvent,
}));
vi.mock("@/lib/twilio/verify-signature", () => ({
  readTwilioFormParams: async (req: Request) => {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const out: Record<string, string> = {};
    params.forEach((v, k) => { out[k] = v; });
    return out;
  },
  verifyTwilioSignature: () => ({ ok: true }),
  getTwilioRequestPublicUrl: (req: NextRequest) => req.url,
}));

import { POST } from "@/app/api/webhooks/twilio-voice-status/route";

function buildRequest(fields: Record<string, string>) {
  return new NextRequest("https://app.example.com/api/webhooks/twilio-voice-status", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  });
}

describe("POST /api/webhooks/twilio-voice-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.webhookEvent.findFirst.mockResolvedValue(null);
    db.webhookEvent.create.mockResolvedValue(undefined);
    db.activity.create.mockResolvedValue({ id: "activity_1" });
    scheduleLeadCallback.mockResolvedValue(undefined);
    hasRecentAutomaticCallbackAttempt.mockResolvedValue(false);
    recordCallbackEvent.mockResolvedValue(undefined);
    assessInboundLeadGuard.mockResolvedValue({ blocked: false, payload: null });
    recordInboundLeadGuardEvent.mockResolvedValue(undefined);
    runIdempotent.mockImplementation(async ({ resultFactory }: { resultFactory: () => Promise<unknown> }) => {
      const result = await resultFactory();
      return { idempotencyKey: "k", created: true, result };
    });
  });

  it("creates a deal and queues a callback when the inbound dial gets no answer", async () => {
    findWorkspaceByTwilioNumber.mockResolvedValue({
      id: "ws_1",
      voiceEnabled: true,
      autoCallLeads: true,
      autoCallDelaySec: 90,
      agentMode: "EXECUTION",
      twilioPhoneNumber: "+61411111111",
      settings: { callAllowedStart: "00:00", callAllowedEnd: "23:59" },
    });
    findContactByPhone.mockResolvedValue(null);
    db.contact.create.mockResolvedValue({ id: "contact_1", name: "Caller +61400000000" });
    db.deal.create.mockResolvedValue({ id: "deal_1" });

    const response = await POST(
      buildRequest({
        From: "+61400000000",
        To: "+61411111111",
        DialCallStatus: "no-answer",
        CallSid: "CA123",
      }),
    );

    expect(response.status).toBe(200);
    expect(db.deal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "ws_1",
        contactId: "contact_1",
        stage: "NEW",
        source: "missed_call",
      }),
    });
    expect(scheduleLeadCallback).toHaveBeenCalledWith({
      workspaceId: "ws_1",
      contactId: "contact_1",
      contactPhone: "+61400000000",
      contactName: "Caller +61400000000",
      dealId: "deal_1",
      reason: "missed_call_callback:no-answer",
      delaySec: 0,
      triggerSource: "missed_call",
      callbackKind: "automatic",
    });
  });

  it("does not queue a callback when voice is disabled for the workspace", async () => {
    findWorkspaceByTwilioNumber.mockResolvedValue({
      id: "ws_1",
      voiceEnabled: false,
      settings: { callAllowedStart: "00:00", callAllowedEnd: "23:59" },
    });
    findContactByPhone.mockResolvedValue(null);
    db.contact.create.mockResolvedValue({ id: "contact_1", name: "Caller +61400000000" });
    db.deal.create.mockResolvedValue({ id: "deal_1" });

    const response = await POST(
      buildRequest({
        From: "+61400000000",
        To: "+61411111111",
        DialCallStatus: "failed",
        CallSid: "CA456",
      }),
    );

    expect(response.status).toBe(200);
    expect(db.deal.create).toHaveBeenCalled();
    expect(scheduleLeadCallback).not.toHaveBeenCalled();
    expect(recordCallbackEvent).toHaveBeenCalledWith({
      eventType: "callback_blocked",
      payload: expect.objectContaining({
        workspaceId: "ws_1",
        contactId: "contact_1",
        blockReason: "auto_call_disabled",
      }),
    });
  });

  it("ignores completed calls (which were answered, not missed)", async () => {
    const response = await POST(
      buildRequest({
        From: "+61400000000",
        To: "+61411111111",
        DialCallStatus: "completed",
        CallSid: "CA789",
      }),
    );

    expect(response.status).toBe(200);
    expect(findWorkspaceByTwilioNumber).not.toHaveBeenCalled();
    expect(db.deal.create).not.toHaveBeenCalled();
    expect(scheduleLeadCallback).not.toHaveBeenCalled();
  });

  it("is idempotent — the same CallSid does not create duplicate deals or schedule a second callback", async () => {
    findWorkspaceByTwilioNumber.mockResolvedValue({
      id: "ws_1",
      voiceEnabled: true,
      autoCallLeads: true,
      autoCallDelaySec: 90,
      agentMode: "EXECUTION",
      twilioPhoneNumber: "+61411111111",
      settings: { callAllowedStart: "00:00", callAllowedEnd: "23:59" },
    });
    // Simulate the duplicate-delivery case: runIdempotent returns
    // created:false because the first invocation already claimed the
    // CallSid. The route must NOT re-create the deal or re-schedule.
    runIdempotent.mockResolvedValue({
      idempotencyKey: "k",
      created: false,
      result: { contactId: "contact_1", dealId: "deal_1" },
    });

    const response = await POST(
      buildRequest({
        From: "+61400000000",
        To: "+61411111111",
        DialCallStatus: "no-answer",
        CallSid: "CA-DUP",
      }),
    );

    expect(response.status).toBe(200);
    expect(db.deal.create).not.toHaveBeenCalled();
    expect(scheduleLeadCallback).not.toHaveBeenCalled();
  });

  it("routes the missed-call processing through runIdempotent keyed on CallSid", async () => {
    findWorkspaceByTwilioNumber.mockResolvedValue({
      id: "ws_1",
      voiceEnabled: true,
      autoCallLeads: true,
      autoCallDelaySec: 90,
      agentMode: "EXECUTION",
      twilioPhoneNumber: "+61411111111",
      settings: { callAllowedStart: "00:00", callAllowedEnd: "23:59" },
    });
    findContactByPhone.mockResolvedValue({ id: "contact_1", name: "Caller" });
    db.deal.create.mockResolvedValue({ id: "deal_1" });

    await POST(
      buildRequest({
        From: "+61400000000",
        To: "+61411111111",
        DialCallStatus: "no-answer",
        CallSid: "CA-XYZ",
      }),
    );

    expect(runIdempotent).toHaveBeenCalledTimes(1);
    const args = runIdempotent.mock.calls[0][0];
    expect(args.actionType).toBe("TWILIO_MISSED_CALL");
    expect(args.parts).toEqual(["CA-XYZ"]);
  });
});
