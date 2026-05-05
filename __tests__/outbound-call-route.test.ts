import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { initiateOutboundCall, isVoiceAgentSecretAuthorized, getAuthUser } = vi.hoisted(() => ({
  initiateOutboundCall: vi.fn(),
  isVoiceAgentSecretAuthorized: vi.fn(),
  getAuthUser: vi.fn(),
}));

vi.mock("@/lib/outbound-call", () => ({
  initiateOutboundCall,
}));

vi.mock("@/lib/voice-agent-auth", () => ({
  isVoiceAgentSecretAuthorized,
}));

vi.mock("@/lib/auth", () => ({
  getAuthUser,
}));

import { POST } from "@/app/api/internal/outbound-call/route";

function makeRequest(body: Record<string, unknown>, headers?: Record<string, string>) {
  return new NextRequest("https://www.earlymark.ai/api/internal/outbound-call", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
  });
}

describe("POST /api/internal/outbound-call", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isVoiceAgentSecretAuthorized.mockReturnValue(false);
    getAuthUser.mockResolvedValue(null);
  });

  it("rejects unauthorized callers", async () => {
    const response = await POST(makeRequest({ workspaceId: "ws_1", contactPhone: "+61434955958" }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("accepts voice-agent-secret authorization", async () => {
    isVoiceAgentSecretAuthorized.mockReturnValue(true);
    initiateOutboundCall.mockResolvedValue({ callSid: "CA123", roomName: "room_1" });

    const response = await POST(
      makeRequest(
        { workspaceId: "ws_1", contactPhone: "+61434955958", contactName: "Miguel" },
        { "x-voice-agent-secret": "secret" },
      ),
    );

    expect(initiateOutboundCall).toHaveBeenCalledWith({
      workspaceId: "ws_1",
      contactPhone: "+61434955958",
      contactName: "Miguel",
      dealId: undefined,
      reason: undefined,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      callSid: "CA123",
      roomName: "room_1",
    });
  });

  it("accepts authenticated user sessions when no secret is provided", async () => {
    getAuthUser.mockResolvedValue({ email: "miguel@example.com" });
    initiateOutboundCall.mockResolvedValue({ ok: true });

    const response = await POST(makeRequest({ workspaceId: "ws_1", contactPhone: "+61434955958" }));

    expect(response.status).toBe(200);
    expect(initiateOutboundCall).toHaveBeenCalled();
  });

  it("validates required fields", async () => {
    getAuthUser.mockResolvedValue({ email: "miguel@example.com" });

    const response = await POST(makeRequest({ workspaceId: "ws_1" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "workspaceId and contactPhone are required",
    });
  });

  it("surfaces outbound call failures", async () => {
    getAuthUser.mockResolvedValue({ email: "miguel@example.com" });
    initiateOutboundCall.mockRejectedValue(new Error("Twilio trunk missing"));

    const response = await POST(makeRequest({ workspaceId: "ws_1", contactPhone: "+61434955958" }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Twilio trunk missing",
    });
  });
});
