import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  waitUntil: vi.fn(),
  processAgentCommand: vi.fn(),
  classifyMessage: vi.fn(),
  db: {
    activity: {
      create: vi.fn(),
    },
    webhookEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
  findUserByPhone: vi.fn(),
  twilioMessagesCreate: vi.fn(),
}));

vi.mock("@vercel/functions", () => ({
  waitUntil: hoisted.waitUntil,
}));
vi.mock("@/lib/services/ai-agent", () => ({
  processAgentCommand: hoisted.processAgentCommand,
}));
vi.mock("@/lib/spam-classifier", () => ({
  classifyMessage: hoisted.classifyMessage,
}));
vi.mock("@/lib/db", () => ({ db: hoisted.db }));
vi.mock("@/lib/workspace-routing", () => ({
  findUserByPhone: hoisted.findUserByPhone,
}));
vi.mock("twilio", () => ({
  default: vi.fn(() => ({
    messages: {
      create: hoisted.twilioMessagesCreate,
    },
  })),
}));

describe("POST /api/webhooks/whatsapp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC123");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "token");
    vi.stubEnv("TWILIO_WHATSAPP_NUMBER", "+61485010634");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("replies with an unauthorized notice for unknown numbers", async () => {
    hoisted.findUserByPhone.mockResolvedValue(null);
    const { POST } = await import("@/app/api/webhooks/whatsapp/route");

    const body = new URLSearchParams({
      From: "whatsapp:+61400000000",
      Body: "hello",
    });

    const response = await POST(
      new Request("https://app.example.com/api/webhooks/whatsapp", {
        method: "POST",
        body,
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
    expect(hoisted.twilioMessagesCreate).toHaveBeenCalledWith({
      from: "whatsapp:+61485010634",
      to: "whatsapp:+61400000000",
      body: "🚫 Number not recognized. Please ensure your personal mobile number is saved in your Earlymark settings.",
    });
    expect(hoisted.waitUntil).not.toHaveBeenCalled();
  });

  it("records inbound traffic immediately and filters spam using the workspace id", async () => {
    hoisted.findUserByPhone.mockResolvedValue({ id: "user_1", workspaceId: "ws_1" });
    hoisted.classifyMessage.mockResolvedValue({
      classification: "spam",
      reason: "known spam pattern",
      confidence: 0.92,
    });
    hoisted.db.activity.create.mockResolvedValue({});
    const { POST } = await import("@/app/api/webhooks/whatsapp/route");

    const body = new URLSearchParams({
      From: "whatsapp:+61400000000",
      Body: "cheap seo offer",
    });

    const response = await POST(
      new Request("https://app.example.com/api/webhooks/whatsapp", {
        method: "POST",
        body,
      }),
    );

    expect(response.status).toBe(200);
    expect(hoisted.db.webhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: "whatsapp.inbound",
        status: "received",
        payload: expect.objectContaining({
          userId: "user_1",
          workspaceId: "ws_1",
          from: "+61400000000",
        }),
      }),
    });
    expect(hoisted.waitUntil).toHaveBeenCalledTimes(1);
    await hoisted.waitUntil.mock.calls[0][0];
    expect(hoisted.classifyMessage).toHaveBeenCalledWith("ws_1", "cheap seo offer", "whatsapp:+61400000000");
    expect(hoisted.db.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "💬 SMS/WhatsApp Filtered: Spam",
        userId: "user_1",
      }),
    });
    expect(hoisted.processAgentCommand).not.toHaveBeenCalled();
  });

  it("processes real commands in the background and logs a successful outbound reply", async () => {
    hoisted.findUserByPhone.mockResolvedValue({ id: "user_1", workspaceId: "ws_1" });
    hoisted.classifyMessage.mockResolvedValue({
      classification: "lead",
      reason: "",
      confidence: 0.1,
    });
    hoisted.processAgentCommand.mockResolvedValue("Booked it in.");
    hoisted.twilioMessagesCreate.mockResolvedValue({ sid: "SM123" });
    const { POST } = await import("@/app/api/webhooks/whatsapp/route");

    const body = new URLSearchParams({
      From: "whatsapp:+61400000000",
      Body: "book Alex for tomorrow",
    });

    const response = await POST(
      new Request("https://app.example.com/api/webhooks/whatsapp", {
        method: "POST",
        body,
      }),
    );

    expect(response.status).toBe(200);
    expect(hoisted.waitUntil).toHaveBeenCalledTimes(1);
    await hoisted.waitUntil.mock.calls[0][0];
    expect(hoisted.classifyMessage).toHaveBeenCalledWith("ws_1", "book Alex for tomorrow", "whatsapp:+61400000000");
    expect(hoisted.processAgentCommand).toHaveBeenCalledWith("user_1", "book Alex for tomorrow");
    expect(hoisted.twilioMessagesCreate).toHaveBeenCalledWith({
      from: "whatsapp:+61485010634",
      to: "whatsapp:+61400000000",
      body: "Booked it in.",
    });
    expect(hoisted.db.webhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: "whatsapp.outbound",
        status: "success",
        payload: expect.objectContaining({
          sid: "SM123",
          userId: "user_1",
          workspaceId: "ws_1",
        }),
      }),
    });
  });

  it("logs processing failures and sends a fallback reply when the agent errors", async () => {
    hoisted.findUserByPhone.mockResolvedValue({ id: "user_1", workspaceId: "ws_1" });
    hoisted.classifyMessage.mockResolvedValue({
      classification: "lead",
      reason: "",
      confidence: 0.02,
    });
    hoisted.processAgentCommand.mockRejectedValue(new Error("agent timeout"));
    const { POST } = await import("@/app/api/webhooks/whatsapp/route");

    const body = new URLSearchParams({
      From: "whatsapp:+61411112222",
      Body: "show me today's jobs",
    });

    const response = await POST(
      new Request("https://app.example.com/api/webhooks/whatsapp", {
        method: "POST",
        body,
      }),
    );

    expect(response.status).toBe(200);
    expect(hoisted.findUserByPhone).toHaveBeenCalledWith("+61411112222");
    expect(hoisted.waitUntil).toHaveBeenCalledTimes(1);
    await hoisted.waitUntil.mock.calls[0][0];
    expect(hoisted.twilioMessagesCreate).toHaveBeenCalledWith({
      from: "whatsapp:+61485010634",
      to: "whatsapp:+61411112222",
      body: "⚠️ The system encountered an error while processing your request. Please try again later.",
    });
    expect(hoisted.db.webhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: "whatsapp.processing",
        status: "error",
        payload: expect.objectContaining({
          userId: "user_1",
          workspaceId: "ws_1",
          from: "+61411112222",
        }),
      }),
    });
  });
});
