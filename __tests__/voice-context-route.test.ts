import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  getWorkspaceVoiceGrounding: vi.fn(),
  findWorkspaceByTwilioNumber: vi.fn(),
  isVoiceAgentSecretAuthorized: vi.fn(),
}));

vi.mock("@/lib/ai/context", () => ({
  getWorkspaceVoiceGrounding: hoisted.getWorkspaceVoiceGrounding,
}));

vi.mock("@/lib/workspace-routing", () => ({
  findWorkspaceByTwilioNumber: hoisted.findWorkspaceByTwilioNumber,
}));

vi.mock("@/lib/voice-agent-auth", () => ({
  isVoiceAgentSecretAuthorized: hoisted.isVoiceAgentSecretAuthorized,
}));

import { POST } from "@/app/api/internal/voice-context/route";

describe("POST /api/internal/voice-context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.isVoiceAgentSecretAuthorized.mockReturnValue(true);
    hoisted.getWorkspaceVoiceGrounding.mockResolvedValue({ businessName: "Earlymark Plumbing" });
    hoisted.findWorkspaceByTwilioNumber.mockResolvedValue({ id: "ws_1" });
  });

  it("rejects unauthorized callers", async () => {
    hoisted.isVoiceAgentSecretAuthorized.mockReturnValue(false);

    const response = await POST(
      new NextRequest("https://earlymark.ai/api/internal/voice-context", {
        method: "POST",
        body: JSON.stringify({ workspaceId: "ws_1" }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("rejects invalid payloads", async () => {
    const response = await POST(
      new NextRequest("https://earlymark.ai/api/internal/voice-context", {
        method: "POST",
        headers: { "x-voice-agent-secret": "secret" },
        body: JSON.stringify({ workspaceId: 123 }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  it("returns grounding for an explicit workspace id", async () => {
    const response = await POST(
      new NextRequest("https://earlymark.ai/api/internal/voice-context", {
        method: "POST",
        headers: { "x-voice-agent-secret": "secret" },
        body: JSON.stringify({ workspaceId: "ws_1" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      grounding: { businessName: "Earlymark Plumbing" },
    });
    expect(hoisted.findWorkspaceByTwilioNumber).not.toHaveBeenCalled();
  });

  it("resolves the workspace by called number when needed", async () => {
    const response = await POST(
      new NextRequest("https://earlymark.ai/api/internal/voice-context", {
        method: "POST",
        headers: { "x-voice-agent-secret": "secret" },
        body: JSON.stringify({ calledPhone: "+61485010634" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(hoisted.findWorkspaceByTwilioNumber).toHaveBeenCalledWith("+61485010634");
  });

  it("returns 404 when voice grounding is missing", async () => {
    hoisted.getWorkspaceVoiceGrounding.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("https://earlymark.ai/api/internal/voice-context", {
        method: "POST",
        headers: { "x-voice-agent-secret": "secret" },
        body: JSON.stringify({ workspaceId: "ws_1" }),
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Voice grounding not found" });
  });
});
