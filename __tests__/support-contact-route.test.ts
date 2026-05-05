import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  requireCurrentWorkspaceAccess: vi.fn(),
  db: {
    user: {
      findUnique: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
  },
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess: hoisted.requireCurrentWorkspaceAccess,
}));
vi.mock("@/lib/db", () => ({ db: hoisted.db }));
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: hoisted.sendEmail,
    };
  },
}));

import { POST } from "@/app/api/support/contact/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("https://www.earlymark.ai/api/support/contact", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("support contact route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RESEND_API_KEY;
    delete process.env.SUPPORT_EMAIL_TO;
    delete process.env.SUPPORT_EMAIL_FROM;
    delete process.env.RESEND_FROM_DOMAIN;

    hoisted.requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_1",
      name: "Miguel",
      role: "OWNER",
      workspaceId: "ws_1",
    });
    hoisted.db.user.findUnique.mockResolvedValue({
      id: "user_1",
      name: "Miguel",
      email: "miguel@example.com",
      workspace: {
        name: "Friendly Plumbing",
        twilioPhoneNumber: "+61400000000",
        type: "TRADIE",
      },
    });
    hoisted.db.activity.create.mockResolvedValue({ id: "activity_1" });
    hoisted.sendEmail.mockResolvedValue({ data: { id: "email_1" }, error: null });
  });

  it("uses shared workspace access and logs support requests against the resolved app user", async () => {
    const response = await POST(makeRequest({
      subject: "Phone setup",
      message: "Tracey number is confusing.",
      priority: "high",
    }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Support email is not configured",
    });
    expect(hoisted.requireCurrentWorkspaceAccess).toHaveBeenCalled();
    expect(hoisted.db.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user_1" },
      }),
    );
    expect(hoisted.db.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Support Request: Phone setup",
        userId: "user_1",
        content: expect.stringContaining("Workspace: Friendly Plumbing"),
      }),
    });
  });

  it("sends the support email when Resend is configured", async () => {
    process.env.RESEND_API_KEY = "resend_test_key";
    process.env.SUPPORT_EMAIL_TO = "support@earlymark.ai";

    const response = await POST(makeRequest({
      subject: "Inbox issue",
      message: "Customer replies are hard to follow.",
      priority: "medium",
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "Support request sent successfully",
    });
    expect(hoisted.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["support@earlymark.ai"],
        replyTo: "miguel@example.com",
        subject: "[Support:MEDIUM] Inbox issue",
      }),
    );
  });

  it("returns unauthenticated when shared workspace access cannot resolve a user", async () => {
    hoisted.requireCurrentWorkspaceAccess.mockRejectedValue(new Error("Workspace access not found"));

    const response = await POST(makeRequest({
      subject: "Help",
      message: "Please help.",
      priority: "medium",
    }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Not authenticated" });
    expect(hoisted.db.activity.create).not.toHaveBeenCalled();
  });
});
