import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  db,
  processIncomingEmailWithGemini,
  triageIncomingLead,
  createGoogleGenerativeAI,
  generateObject,
  captureException,
} = vi.hoisted(() => ({
  db: {
    webhookEvent: { create: vi.fn() },
    workspace: { findFirst: vi.fn(), findUnique: vi.fn() },
    contact: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    deal: { create: vi.fn() },
    activity: { create: vi.fn(), count: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    notification: { create: vi.fn() },
    chatMessage: { create: vi.fn(), updateMany: vi.fn() },
  },
  processIncomingEmailWithGemini: vi.fn(),
  triageIncomingLead: vi.fn(),
  createGoogleGenerativeAI: vi.fn(),
  generateObject: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/ai/email-agent", () => ({ processIncomingEmailWithGemini }));
vi.mock("@/lib/ai/triage", () => ({ triageIncomingLead }));
vi.mock("@sentry/nextjs", () => ({ captureException }));
vi.mock("@ai-sdk/google", () => ({ createGoogleGenerativeAI }));
vi.mock("ai", () => ({ generateObject }));

describe("POST /api/webhooks/inbound-email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllEnvs();
    db.webhookEvent.create.mockResolvedValue(undefined);
    db.notification.create.mockResolvedValue(undefined);
    db.activity.create.mockResolvedValue({ id: "activity_1" });
    db.activity.count.mockResolvedValue(0);
    db.chatMessage.create.mockResolvedValue({ id: "chat_1" });
    db.chatMessage.updateMany.mockResolvedValue({ count: 1 });
    db.workspace.findUnique.mockResolvedValue({ ownerId: "owner_1" });
    triageIncomingLead.mockResolvedValue(null);
    createGoogleGenerativeAI.mockReturnValue(vi.fn());
    generateObject.mockResolvedValue({ object: {} });
  });

  async function loadRoute() {
    return import("@/app/api/webhooks/inbound-email/route");
  }

  it("rejects invalid signed webhooks", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "whsec_dGVzdC1zZWNyZXQ=");
    const { POST } = await loadRoute();

    const response = await POST(
      new NextRequest("https://app.example.com/api/webhooks/inbound-email", {
        method: "POST",
        body: JSON.stringify({ type: "email.received", data: {} }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Invalid webhook signature" });
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(db.webhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: "resend",
        eventType: "verification_failed",
        status: "error",
      }),
    });
  });

  it("returns 400 when the inbound payload is missing sender or recipient", async () => {
    const { POST } = await loadRoute();

    const response = await POST(
      new NextRequest("https://app.example.com/api/webhooks/inbound-email", {
        method: "POST",
        body: JSON.stringify({ type: "email.received", data: { subject: "Hello" } }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Missing 'to' or 'from' in payload" });
  });

  it("processes delivery tracking events on the shared inbound-email webhook", async () => {
    db.contact.findFirst.mockResolvedValue({
      id: "contact_delivery_1",
      name: "Alex",
      workspaceId: "ws_delivery_1",
    });
    db.activity.findFirst.mockResolvedValue({ id: "activity_delivery_1" });

    const { POST } = await loadRoute();
    const response = await POST(
      new NextRequest("https://app.example.com/api/webhooks/inbound-email", {
        method: "POST",
        body: JSON.stringify({
          type: "email.delivered",
          data: {
            to: ["alex@example.com"],
            email_id: "email_123",
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      event: "email.delivered",
      status: "Delivered",
      contactId: "contact_delivery_1",
    });
    expect(db.activity.update).toHaveBeenCalledWith({
      where: { id: "activity_delivery_1" },
      data: {
        description: expect.stringContaining("Delivered at "),
      },
    });
    expect(db.webhookEvent.create).toHaveBeenCalledWith({
      data: {
        provider: "resend",
        eventType: "email.delivered",
        status: "success",
        payload: {
          to: "alex@example.com",
          contactId: "contact_delivery_1",
          emailId: "email_123",
        },
      },
    });
  });

  it("creates lead-capture records for recognised provider emails", async () => {
    db.workspace.findFirst.mockResolvedValue({
      id: "ws_1",
      name: "Acme Plumbing",
      ownerId: "owner_1",
      inboundEmailAlias: "acme",
      autoCallLeads: true,
      twilioPhoneNumber: "+61200000000",
      settings: { callAllowedStart: "00:00", callAllowedEnd: "23:59" },
    });
    db.contact.findFirst.mockResolvedValue(null);
    db.contact.create.mockResolvedValue({ id: "contact_1", name: "Jane Citizen" });
    db.deal.create.mockResolvedValue({ id: "deal_1" });

    const { POST } = await loadRoute();
    const response = await POST(
      new NextRequest("https://app.example.com/api/webhooks/inbound-email", {
        method: "POST",
        body: JSON.stringify({
          type: "email.received",
          data: {
            to: "acme@inbound.earlymark.ai",
            from: "HiPages Notifications <notifications@hipages.com.au>",
            subject: "Urgent plumbing lead",
            text: "Name: Jane Citizen Phone: 0412 345 678 Burst pipe in kitchen",
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        success: true,
        leadCapture: true,
        platform: "HiPages",
        workspaceId: "ws_1",
        contactId: "contact_1",
        dealId: "deal_1",
        autoCallBlocked: true,
        autoCallBlockReason: "urgent",
      }),
    );
    expect(db.contact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "ws_1",
        name: "Jane Citizen",
        phone: "0412345678",
      }),
    });
    expect(db.notification.create).toHaveBeenCalled();
    expect(db.webhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: "resend",
        eventType: "email.received",
        status: "success",
      }),
    });
  });

  it("logs normal inbound emails and runs the Gemini email agent", async () => {
    db.workspace.findFirst.mockResolvedValue({
      id: "ws_2",
      name: "Acme Plumbing",
      ownerId: "owner_2",
      inboundEmail: "sales@acme.earlymark.ai",
      inboundEmailAlias: null,
      autoCallLeads: false,
      twilioPhoneNumber: null,
      settings: {},
    });
    db.contact.findFirst.mockResolvedValue({
      id: "contact_2",
      name: "John Sender",
      email: "john@example.com",
      deals: [{ id: "deal_open_1", updatedAt: new Date().toISOString() }],
    });
    processIncomingEmailWithGemini.mockResolvedValue({
      reply: "Thanks, we can help with that.",
      isGenuineLead: true,
      policyOutcome: { mode: "ASSIST" },
    });

    const { POST } = await loadRoute();
    const response = await POST(
      new NextRequest("https://app.example.com/api/webhooks/inbound-email", {
        method: "POST",
        body: JSON.stringify({
          type: "email.received",
          data: {
            to: "sales@acme.earlymark.ai",
            from: "John Sender <john@example.com>",
            subject: "Need a quote",
            text: "Can you quote for replacing a hot water system?",
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        success: true,
        workspaceId: "ws_2",
        contactId: "contact_2",
        dealId: "deal_open_1",
        replySent: false,
        leadQuality: "genuine",
      }),
    );
    expect(processIncomingEmailWithGemini).toHaveBeenCalledWith({
      workspaceId: "ws_2",
      senderName: "John Sender",
      senderEmail: "john@example.com",
      subject: "Need a quote",
      body: "Can you quote for replacing a hot water system?",
      contactId: "contact_2",
      dealId: "deal_open_1",
      isFirstReplyForContact: true,
    });
    expect(db.chatMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "ws_2",
        role: "assistant",
        content: "Thanks, we can help with that.",
      }),
    });
  });
});
