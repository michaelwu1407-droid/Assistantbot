import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  getWorkspaceVoiceGrounding: vi.fn(),
  db: {
    workspace: {
      findMany: vi.fn(),
    },
  },
  isVoiceAgentSecretAuthorized: vi.fn(),
}));

vi.mock("@/lib/ai/context", () => ({
  getWorkspaceVoiceGrounding: hoisted.getWorkspaceVoiceGrounding,
}));

vi.mock("@/lib/db", () => ({
  db: hoisted.db,
}));

vi.mock("@/lib/voice-agent-auth", () => ({
  isVoiceAgentSecretAuthorized: hoisted.isVoiceAgentSecretAuthorized,
}));

import { GET } from "@/app/api/internal/voice-grounding-index/route";

describe("GET /api/internal/voice-grounding-index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.isVoiceAgentSecretAuthorized.mockReturnValue(true);
    hoisted.db.workspace.findMany.mockResolvedValue([
      {
        id: "ws_1",
        twilioPhoneNumber: "+61485010634",
        twilioPhoneNumberNormalized: "+61485010634",
        updatedAt: new Date("2026-04-27T10:00:00.000Z"),
      },
      {
        id: "ws_2",
        twilioPhoneNumber: "+61485010635",
        twilioPhoneNumberNormalized: "+61485010635",
        updatedAt: new Date("2026-04-27T11:00:00.000Z"),
      },
    ]);
    hoisted.getWorkspaceVoiceGrounding
      .mockResolvedValueOnce({ businessName: "Alpha Plumbing" })
      .mockResolvedValueOnce(null);
  });

  it("rejects unauthorized callers", async () => {
    hoisted.isVoiceAgentSecretAuthorized.mockReturnValue(false);

    const response = await GET(
      new NextRequest("https://earlymark.ai/api/internal/voice-grounding-index"),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns only workspaces with grounding data", async () => {
    const response = await GET(
      new NextRequest("https://earlymark.ai/api/internal/voice-grounding-index", {
        headers: { "x-voice-agent-secret": "secret" },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.groundings).toEqual([
      {
        workspaceId: "ws_1",
        calledPhone: "+61485010634",
        calledPhoneNormalized: "+61485010634",
        updatedAt: "2026-04-27T10:00:00.000Z",
        grounding: { businessName: "Alpha Plumbing" },
      },
    ]);
  });
});
