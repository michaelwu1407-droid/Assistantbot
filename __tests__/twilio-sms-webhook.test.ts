import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  waitUntil,
  prisma,
  classifyMessage,
  getWorkspaceTwilioClient,
  generateSMSResponse,
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
    chatMessage: {
      create: vi.fn(),
    },
  },
  classifyMessage: vi.fn(),
  getWorkspaceTwilioClient: vi.fn(),
  generateSMSResponse: vi.fn(),
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

vi.mock("@/lib/workspace-routing", () => ({
  findContactByPhone,
  findWorkspaceByTwilioNumber,
}));

import { POST } from "@/app/api/twilio/webhook/route";

function buildSmsRequest() {
  const body = new URLSearchParams({
    From: "+61400000000",
    To: "+61485010634",
    Body: "Need a quote",
    MessageSid: "SM123",
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

  it("records inbound SMS success and preserves SMS metadata on the user message", async () => {
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
    expect(waitUntil).not.toHaveBeenCalled();
  });
});
