import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  db: {
    workspace: {
      findUnique: vi.fn(),
    },
    deal: {
      findMany: vi.fn(),
    },
  },
  isVoiceAgentSecretAuthorized: vi.fn(),
  runCreateJobNatural: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: hoisted.db,
}));

vi.mock("@/lib/voice-agent-auth", () => ({
  isVoiceAgentSecretAuthorized: hoisted.isVoiceAgentSecretAuthorized,
}));

vi.mock("@/actions/chat-actions", () => ({
  runCreateJobNatural: hoisted.runCreateJobNatural,
}));

import { POST } from "@/app/api/internal/voice-scheduling/route";

describe("POST /api/internal/voice-scheduling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    hoisted.isVoiceAgentSecretAuthorized.mockReturnValue(true);
    hoisted.db.workspace.findUnique.mockResolvedValue({
      workingHoursStart: "08:00",
      workingHoursEnd: "17:00",
    });
    hoisted.db.deal.findMany.mockResolvedValue([]);
    hoisted.runCreateJobNatural.mockResolvedValue({ success: true, dealId: "deal_1" });
  });

  it("rejects unauthorized callers", async () => {
    hoisted.isVoiceAgentSecretAuthorized.mockReturnValue(false);

    const response = await POST(
      new NextRequest("https://earlymark.ai/api/internal/voice-scheduling", {
        method: "POST",
        body: JSON.stringify({ action: "check_availability", workspaceId: "ws_1" }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("rejects invalid payloads", async () => {
    const response = await POST(
      new NextRequest("https://earlymark.ai/api/internal/voice-scheduling", {
        method: "POST",
        headers: { "x-voice-agent-secret": "secret" },
        body: JSON.stringify({ action: "check_availability" }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  it("returns a summary for availability checks", async () => {
    hoisted.db.deal.findMany.mockResolvedValue([
      { scheduledAt: new Date("2026-04-28T00:30:00.000Z"), title: "Blocked drain" },
    ]);

    const response = await POST(
      new NextRequest("https://earlymark.ai/api/internal/voice-scheduling", {
        method: "POST",
        headers: { "x-voice-agent-secret": "secret" },
        body: JSON.stringify({ action: "check_availability", workspaceId: "ws_1" }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.summary).toContain("Working hours are 08:00");
    expect(Array.isArray(body.bookedSlots)).toBe(true);
  });

  it("returns nearby-job context when geocoding and matches succeed", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([{ lat: "-33.87", lon: "151.20" }]),
    } as unknown as Response);
    hoisted.db.deal.findMany.mockResolvedValue([
      {
        title: "Nearby repair",
        latitude: -33.8705,
        longitude: 151.2005,
        scheduledAt: new Date("2026-04-28T01:00:00.000Z"),
      },
    ]);

    const response = await POST(
      new NextRequest("https://earlymark.ai/api/internal/voice-scheduling", {
        method: "POST",
        headers: { "x-voice-agent-secret": "secret" },
        body: JSON.stringify({
          action: "find_nearby",
          workspaceId: "ws_1",
          address: "1 George St Sydney",
          date: "2026-04-28",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.summary).toContain("Nearby repair");
    expect(body.nearbyJob.title).toBe("Nearby repair");
  });

  it("delegates create_job requests to runCreateJobNatural", async () => {
    const response = await POST(
      new NextRequest("https://earlymark.ai/api/internal/voice-scheduling", {
        method: "POST",
        headers: { "x-voice-agent-secret": "secret" },
        body: JSON.stringify({
          action: "create_job",
          workspaceId: "ws_1",
          clientName: "Jane Citizen",
          address: "1 George St Sydney",
          workDescription: "Blocked drain",
          phone: "+61400000000",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, dealId: "deal_1" });
    expect(hoisted.runCreateJobNatural).toHaveBeenCalledWith("ws_1", {
      clientName: "Jane Citizen",
      address: "1 George St Sydney",
      workDescription: "Blocked drain",
      schedule: undefined,
      phone: "+61400000000",
      email: undefined,
      price: 0,
    });
  });
});
