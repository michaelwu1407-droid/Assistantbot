import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  waitUntil,
  prisma,
  classifyMessage,
  getWorkspaceTwilioClient,
  generateSMSResponse,
  triageIncomingLead,
  saveTriageRecommendation,
  findContactByPhone,
  findWorkspaceByTwilioNumber,
} = vi.hoisted(() => ({
  waitUntil: vi.fn(),
  prisma: {
    webhookEvent: {
      create: vi.fn(),
    },
    contact: {
      create: vi.fn(),
    },
    activity: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    deal: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    chatMessage: {
      create: vi.fn(),
    },
  },
  classifyMessage: vi.fn(),
  getWorkspaceTwilioClient: vi.fn(),
  generateSMSResponse: vi.fn(),
  triageIncomingLead: vi.fn(),
  saveTriageRecommendation: vi.fn(),
  findContactByPhone: vi.fn(),
  findWorkspaceByTwilioNumber: vi.fn(),
}));

vi.mock("@vercel/functions", () => ({
  waitUntil,
}));

vi.mock("@/lib/db", () => ({
  db: prisma,
}));

vi.mock("@/lib/spam-classifier", () => ({
  classifyMessage,
}));

vi.mock("@/lib/twilio", () => ({
  getWorkspaceTwilioClient,
}));

vi.mock("@/lib/ai/sms-agent", () => ({
  generateSMSResponse,
}));

vi.mock("@/lib/ai/triage", () => ({
  triageIncomingLead,
  saveTriageRecommendation,
}));

vi.mock("@/lib/workspace-routing", () => ({
  findContactByPhone,
  findWorkspaceByTwilioNumber,
}));

import { POST } from "@/app/api/twilio/webhook/route";

function buildSmsRequest(overrides?: Partial<Record<"From" | "To" | "Body" | "MessageSid", string>>) {
  const body = new URLSearchParams({
    From: overrides?.From ?? "+61400000000",
    To: overrides?.To ?? "+61485010634",
    Body: overrides?.Body ?? "Need a quote",
    MessageSid: overrides?.MessageSid ?? "SM123",
  });

  return new NextRequest("https://app.example.com/api/twilio/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

describe("POST /api/twilio/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.webhookEvent.create.mockResolvedValue(undefined);
    prisma.contact.create.mockResolvedValue({ id: "contact_new" });
    prisma.activity.findFirst.mockResolvedValue({ id: "activity_1" });
    prisma.activity.create.mockResolvedValue({ id: "activity_1" });
    prisma.deal.findFirst.mockResolvedValue(null);
    prisma.deal.create.mockResolvedValue({ id: "deal_1" });
    prisma.deal.update.mockResolvedValue({});
    prisma.user.findFirst.mockResolvedValue({ id: "owner_1" });
    prisma.notification.create.mockResolvedValue({});
    prisma.chatMessage.create.mockResolvedValue(undefined);
    classifyMessage.mockResolvedValue({ classification: "ham" });
    getWorkspaceTwilioClient.mockReturnValue({
      messages: {
        create: vi.fn().mockResolvedValue({ sid: "SM_REPLY" }),
      },
    });
    generateSMSResponse.mockResolvedValue({
      text: "Sure, what do you need priced?",
      policyOutcome: {
        mode: "execute",
      },
    });
    triageIncomingLead.mockResolvedValue({ recommendation: "ACCEPT", flags: [] });
    saveTriageRecommendation.mockResolvedValue(undefined);
    findContactByPhone.mockResolvedValue({ id: "contact_1" });
  });

  it("records a Twilio webhook error when no matching workspace is found", async () => {
    findWorkspaceByTwilioNumber.mockResolvedValue(null);

    const response = await POST(buildSmsRequest());

    expect(response.status).toBe(200);
    expect(prisma.webhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: "twilio",
        eventType: "sms.received",
        status: "error",
        payload: expect.objectContaining({
          from: "+61400000000",
          to: "+61485010634",
          messageSid: "SM123",
        }),
      }),
    });
    expect(prisma.chatMessage.create).not.toHaveBeenCalled();
  });

  it("records inbound SMS success and still processes replies through the shared Tracey mode policy", async () => {
    findWorkspaceByTwilioNumber.mockResolvedValue({
      id: "ws_1",
      name: "Alpha Plumbing",
      settings: {
        autoRespondToMessages: false,
      },
      twilioPhoneNumber: "+61485010634",
    });

    const response = await POST(buildSmsRequest());

    expect(response.status).toBe(200);
    expect(prisma.webhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: "twilio",
        eventType: "sms.received",
        status: "success",
        payload: expect.objectContaining({
          workspaceId: "ws_1",
          workspaceName: "Alpha Plumbing",
          from: "+61400000000",
          to: "+61485010634",
          messageSid: "SM123",
        }),
      }),
    });
    expect(prisma.chatMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        role: "user",
        workspaceId: "ws_1",
        metadata: expect.objectContaining({
          channel: "sms",
          direction: "inbound",
          from: "+61400000000",
          to: "+61485010634",
          externalId: "SM123",
        }),
      }),
    });
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });

  it("captures an obvious new SMS enquiry as a CRM deal before replying", async () => {
    findWorkspaceByTwilioNumber.mockResolvedValue({
      id: "ws_1",
      name: "Alpha Plumbing",
      settings: {},
      twilioPhoneNumber: "+61485010634",
    });
    findContactByPhone.mockResolvedValue({ id: "contact_1", name: "Alex" });

    const response = await POST(buildSmsRequest());
    expect(response.status).toBe(200);

    await waitUntil.mock.calls[0][0];

    expect(prisma.deal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "ws_1",
        contactId: "contact_1",
        title: "SMS enquiry from Alex",
        stage: "NEW",
        source: "sms",
        metadata: expect.objectContaining({
          initialMessage: "Need a quote",
          leadSource: "sms",
        }),
      }),
      select: { id: true },
    });
    expect(triageIncomingLead).toHaveBeenCalledWith("ws_1", {
      title: "SMS enquiry from Alex",
      description: "Need a quote",
    });
    expect(saveTriageRecommendation).toHaveBeenCalledWith("deal_1", {
      recommendation: "ACCEPT",
      flags: [],
    });
    expect(generateSMSResponse).toHaveBeenCalled();
  });

  it("holds risky SMS leads for owner review without auto-replying", async () => {
    findWorkspaceByTwilioNumber.mockResolvedValue({
      id: "ws_1",
      name: "Alpha Plumbing",
      settings: {},
      twilioPhoneNumber: "+61485010634",
    });
    findContactByPhone.mockResolvedValue({ id: "contact_1", name: "Alex" });
    triageIncomingLead.mockResolvedValue({
      recommendation: "HOLD_REVIEW",
      flags: ["Needs review: roofing"],
    });

    const response = await POST(buildSmsRequest());
    expect(response.status).toBe(200);

    await waitUntil.mock.calls[0][0];

    expect(saveTriageRecommendation).toHaveBeenCalledWith("deal_1", {
      recommendation: "HOLD_REVIEW",
      flags: ["Needs review: roofing"],
    });
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "owner_1",
        title: "SMS lead held for review",
        message: "Alex: Needs review: roofing",
        type: "WARNING",
        link: "/crm/deals/deal_1",
      }),
    });
    expect(generateSMSResponse).not.toHaveBeenCalled();
  });

  it("suppresses auto-replies to non-replyable sender ids", async () => {
    findWorkspaceByTwilioNumber.mockResolvedValue({
      id: "ws_1",
      name: "Alpha Plumbing",
      settings: {},
      twilioPhoneNumber: "+61485010634",
    });
    findContactByPhone.mockResolvedValue({ id: "contact_1", name: "Anaconda" });

    const response = await POST(buildSmsRequest({ From: "Anaconda", Body: "Sale ends Sunday" }));
    expect(response.status).toBe(200);

    await waitUntil.mock.calls[0][0];

    expect(generateSMSResponse).not.toHaveBeenCalled();
    expect(prisma.webhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: "twilio",
        eventType: "sms.reply",
        status: "success",
        payload: expect.objectContaining({
          workspaceId: "ws_1",
          from: "+61485010634",
          to: "Anaconda",
          autoRespondEnabled: false,
          replySuppressedReason: "non_replyable_sender",
        }),
      }),
    });
  });
});
