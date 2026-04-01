import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  db: {
    emailIntegration: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    contact: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    deal: {
      create: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
  decrypt: vi.fn(),
  encrypt: vi.fn(),
  parseLeadFromEmail: vi.fn(),
  sendIntroSms: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: hoisted.db }));
vi.mock("@/lib/encryption", () => ({
  decrypt: hoisted.decrypt,
  encrypt: hoisted.encrypt,
}));
vi.mock("@/lib/ai/lead-parser", () => ({
  parseLeadFromEmail: hoisted.parseLeadFromEmail,
}));
vi.mock("@/lib/sms", () => ({
  sendIntroSms: hoisted.sendIntroSms,
}));

import { POST } from "@/app/api/webhooks/email-received/route";

describe("POST /api/webhooks/email-received", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    hoisted.decrypt.mockReturnValue("refresh-token");
    hoisted.encrypt.mockReturnValue("encrypted-access-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects webhook payloads without Pub/Sub message data", async () => {
    const response = await POST(
      new NextRequest("https://app.example.com/api/webhooks/email-received", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "No message data" });
  });

  it("returns 404 when no active email integration matches the inbox", async () => {
    hoisted.db.emailIntegration.findFirst.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("https://app.example.com/api/webhooks/email-received", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: {
            data: Buffer.from(
              JSON.stringify({
                emailAddress: "sales@example.com",
                historyId: "12345",
              }),
            ).toString("base64"),
          },
        }),
      }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Integration not found" });
  });

  it("processes lead-provider email history into CRM records and sends intro SMS", async () => {
    hoisted.db.emailIntegration.findFirst.mockResolvedValue({
      id: "integration_1",
      emailAddress: "sales@example.com",
      refreshToken: "encrypted-refresh-token",
      isActive: true,
      user: {
        id: "user_1",
        workspace: {
          id: "ws_1",
          twilioPhoneNumber: "+61400000000",
        },
      },
    });
    hoisted.parseLeadFromEmail.mockResolvedValue({
      isGenuineLead: true,
      customerName: "Alex",
      customerEmail: "alex@example.com",
      customerPhone: "0400000000",
      customerAddress: "12 King St",
      provider: "hipages",
      jobTitle: "Blocked drain",
      estimatedValue: "250",
      jobDetails: "Kitchen drain blocked",
    });
    hoisted.db.contact.findFirst.mockResolvedValue(null);
    hoisted.db.contact.create.mockResolvedValue({ id: "contact_1" });
    hoisted.db.deal.create.mockResolvedValue({ id: "deal_1" });
    hoisted.db.activity.create.mockResolvedValue({});
    hoisted.db.notification.create.mockResolvedValue({});

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "gmail-access-token", expires_in: 3600 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          history: [{ messagesAdded: [{ message: { id: "msg_1" } }] }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          payload: {
            headers: [
              { name: "Subject", value: "New hipages job request" },
              { name: "From", value: "notifications@hipages.com.au" },
            ],
            body: {
              data: Buffer.from("Customer needs urgent drain repair").toString("base64"),
            },
          },
        }),
      } as Response);

    const response = await POST(
      new NextRequest("https://app.example.com/api/webhooks/email-received", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: {
            data: Buffer.from(
              JSON.stringify({
                emailAddress: "sales@example.com",
                historyId: "12345",
              }),
            ).toString("base64"),
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ processed: 1 });
    expect(hoisted.db.contact.create).toHaveBeenCalledWith({
      data: {
        workspaceId: "ws_1",
        name: "Alex",
        email: "alex@example.com",
        phone: "0400000000",
        address: "12 King St",
      },
    });
    expect(hoisted.db.deal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Blocked drain",
        stage: "NEW",
        contactId: "contact_1",
        workspaceId: "ws_1",
        value: 250,
      }),
    });
    expect(hoisted.sendIntroSms).toHaveBeenCalledWith({
      to: "0400000000",
      workspaceId: "ws_1",
      dealId: "deal_1",
      contactId: "contact_1",
    });
  });
});
