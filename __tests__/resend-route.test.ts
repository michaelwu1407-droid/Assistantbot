import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import crypto from "crypto";

const hoisted = vi.hoisted(() => ({
  db: {
    webhookEvent: {
      create: vi.fn(),
    },
    contact: {
      findFirst: vi.fn(),
    },
    activity: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    workspace: {
      findUnique: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
  captureException: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: hoisted.db }));
vi.mock("@sentry/nextjs", () => ({
  captureException: hoisted.captureException,
}));

import { POST } from "@/app/api/webhooks/resend/route";

function buildSignedRequest(payload: string, secretBase64: string) {
  const svixId = "msg_123";
  const svixTimestamp = String(Math.floor(Date.now() / 1000));
  const secretBytes = Buffer.from(secretBase64, "base64");
  const signature = crypto
    .createHmac("sha256", secretBytes)
    .update(`${svixId}.${svixTimestamp}.${payload}`)
    .digest("base64");

  return new NextRequest("https://app.example.com/api/webhooks/resend", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": `v1,${signature}`,
    },
    body: payload,
  });
}

describe("POST /api/webhooks/resend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    hoisted.db.webhookEvent.create.mockResolvedValue(undefined);
  });

  it("rejects invalid webhook signatures and logs verification failure", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "whsec_dGVzdC1zZWNyZXQ=");

    const response = await POST(
      new NextRequest("https://app.example.com/api/webhooks/resend", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "svix-id": "msg_123",
          "svix-timestamp": String(Math.floor(Date.now() / 1000)),
          "svix-signature": "v1,invalid",
        },
        body: JSON.stringify({ type: "email.delivered", data: { to: "alex@example.com" } }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Invalid webhook signature" });
    expect(hoisted.db.webhookEvent.create).toHaveBeenCalledWith({
      data: {
        provider: "resend",
        eventType: "verification_failed",
        status: "error",
        error: "Invalid webhook signature",
      },
    });
  });

  it("skips unsupported resend events without touching CRM records", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "whsec_dGVzdC1zZWNyZXQ=");
    const payload = JSON.stringify({
      type: "email.sent",
      data: { to: "alex@example.com" },
    });

    const response = await POST(buildSignedRequest(payload, "dGVzdC1zZWNyZXQ="));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, skipped: "email.sent" });
    expect(hoisted.db.contact.findFirst).not.toHaveBeenCalled();
  });

  it("records open events against the latest outbound email activity and notifies the owner", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "whsec_dGVzdC1zZWNyZXQ=");
    hoisted.db.contact.findFirst.mockResolvedValue({
      id: "contact_1",
      name: "Alex",
      workspaceId: "ws_1",
    });
    hoisted.db.activity.findFirst.mockResolvedValue({
      id: "activity_1",
    });
    hoisted.db.workspace.findUnique.mockResolvedValue({
      ownerId: "owner_1",
    });
    hoisted.db.notification.create.mockResolvedValue({});

    const payload = JSON.stringify({
      type: "email.opened",
      data: {
        to: ["alex@example.com"],
        email_id: "email_123",
      },
    });

    const response = await POST(buildSignedRequest(payload, "dGVzdC1zZWNyZXQ="));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      event: "email.opened",
      status: "Opened",
      contactId: "contact_1",
    });
    expect(hoisted.db.activity.update).toHaveBeenCalledWith({
      where: { id: "activity_1" },
      data: {
        description: expect.stringContaining("Opened at "),
      },
    });
    expect(hoisted.db.notification.create).toHaveBeenCalledWith({
      data: {
        userId: "owner_1",
        title: "Email Read Receipt",
        message: "Alex opened your email",
        type: "INFO",
        link: "/crm/dashboard",
      },
    });
    expect(hoisted.db.webhookEvent.create).toHaveBeenCalledWith({
      data: {
        provider: "resend",
        eventType: "email.opened",
        status: "success",
        payload: {
          to: "alex@example.com",
          contactId: "contact_1",
          emailId: "email_123",
        },
      },
    });
  });
});
