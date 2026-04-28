import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  initiateDemoCall: vi.fn(),
  persistDemoLeadAttempt: vi.fn(),
  markDemoLeadInitiated: vi.fn(),
  markDemoLeadFailed: vi.fn(),
  dispatchDemoCallFailureAlert: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/demo-call", () => ({
  initiateDemoCall: hoisted.initiateDemoCall,
}));

vi.mock("@/lib/demo-lead-store", () => ({
  persistDemoLeadAttempt: hoisted.persistDemoLeadAttempt,
  markDemoLeadInitiated: hoisted.markDemoLeadInitiated,
  markDemoLeadFailed: hoisted.markDemoLeadFailed,
}));

vi.mock("@/lib/demo-call-failure-alert", () => ({
  dispatchDemoCallFailureAlert: hoisted.dispatchDemoCallFailureAlert,
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: hoisted.sendEmail,
    };
  },
}));

import { POST } from "@/app/api/contact/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("https://www.earlymark.ai/api/contact", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "203.0.113.7",
      "user-agent": "Vitest Browser",
    },
  });
}

describe("public contact route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "resend_test";
    process.env.RESEND_FROM_DOMAIN = "earlymark.ai";
    hoisted.persistDemoLeadAttempt.mockResolvedValue("lead_1");
    hoisted.markDemoLeadInitiated.mockResolvedValue(undefined);
    hoisted.markDemoLeadFailed.mockResolvedValue(undefined);
    hoisted.dispatchDemoCallFailureAlert.mockResolvedValue(null);
    hoisted.sendEmail.mockResolvedValue({ data: { id: "email_1" }, error: null });
  });

  it("validates required fields", async () => {
    const response = await POST(
      makeRequest({
        name: "Miguel",
        email: "miguel@example.com",
        subject: "",
        message: "Need help",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Name, email, subject and message are required.",
    });
    expect(hoisted.initiateDemoCall).not.toHaveBeenCalled();
    expect(hoisted.sendEmail).not.toHaveBeenCalled();
  });

  it("places a Tracey callback and still sends the support email when a phone number is provided", async () => {
    hoisted.initiateDemoCall.mockResolvedValue({
      normalizedPhone: "+61434955958",
      roomName: "room_123",
      resolvedTrunkId: "trunk_1",
      callerNumber: "+61485010634",
      warnings: [],
    });

    const response = await POST(
      makeRequest({
        department: "sales",
        name: "Miguel Wu",
        email: "miguel@example.com",
        phone: "+61 434 955 958",
        subject: "Need a demo",
        message: "Please get Tracey to call me.",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      callPlaced: true,
      callError: null,
    });
    expect(hoisted.persistDemoLeadAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Miguel",
        lastName: "Wu",
        phone: "+61 434 955 958",
        email: "miguel@example.com",
        source: "contact_form",
        ipAddress: "203.0.113.7",
        userAgent: "Vitest Browser",
      }),
    );
    expect(hoisted.initiateDemoCall).toHaveBeenCalledWith({
      phone: "+61 434 955 958",
      firstName: "Miguel",
      lastName: "Wu",
      email: "miguel@example.com",
    });
    expect(hoisted.markDemoLeadInitiated).toHaveBeenCalledWith("lead_1", {
      roomName: "room_123",
      resolvedTrunkId: "trunk_1",
      callerNumber: "+61485010634",
      warnings: [],
    });
    expect(hoisted.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "[Contact – sales] Need a demo",
        text: expect.stringContaining("Tracey callback: initiated"),
      }),
    );
  });

  it("keeps the request successful when callback placement fails but email succeeds", async () => {
    hoisted.initiateDemoCall.mockRejectedValue(new Error("LiveKit unavailable"));

    const response = await POST(
      makeRequest({
        department: "sales",
        name: "Miguel Wu",
        email: "miguel@example.com",
        phone: "+61 434 955 958",
        subject: "Need a demo",
        message: "Please get Tracey to call me.",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      callPlaced: false,
      callError: "LiveKit unavailable",
    });
    expect(hoisted.markDemoLeadFailed).toHaveBeenCalled();
    expect(hoisted.dispatchDemoCallFailureAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: "lead_1",
        source: "contact_form",
        phone: "+61 434 955 958",
      }),
    );
    expect(hoisted.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Tracey callback FAILED: LiveKit unavailable"),
      }),
    );
  });

  it("returns a 500 when email fails and no callback succeeded", async () => {
    hoisted.sendEmail.mockRejectedValue(new Error("Resend offline"));

    const response = await POST(
      makeRequest({
        department: "support",
        name: "Miguel",
        email: "miguel@example.com",
        subject: "Question",
        message: "Can you help?",
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to send message. Please try again or email us directly.",
    });
  });

  it("does not fail the request when email fails after the callback already succeeded", async () => {
    hoisted.initiateDemoCall.mockResolvedValue({
      normalizedPhone: "+61434955958",
      roomName: "room_123",
      resolvedTrunkId: "trunk_1",
      callerNumber: "+61485010634",
      warnings: [],
    });
    hoisted.sendEmail.mockRejectedValue(new Error("Resend offline"));

    const response = await POST(
      makeRequest({
        department: "sales",
        name: "Miguel",
        email: "miguel@example.com",
        phone: "+61 434 955 958",
        subject: "Need a demo",
        message: "Please call me.",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      callPlaced: true,
      callError: null,
    });
  });
});
