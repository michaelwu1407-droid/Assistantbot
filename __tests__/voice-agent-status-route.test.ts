import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  db: {
    voiceWorkerHeartbeat: {
      create: vi.fn(),
    },
    webhookEvent: {
      create: vi.fn(),
    },
  },
  isVoiceAgentSecretAuthorized: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: hoisted.db,
}));

vi.mock("@/lib/voice-agent-auth", () => ({
  isVoiceAgentSecretAuthorized: hoisted.isVoiceAgentSecretAuthorized,
}));

import { POST } from "@/app/api/internal/voice-agent-status/route";

describe("POST /api/internal/voice-agent-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    hoisted.isVoiceAgentSecretAuthorized.mockReturnValue(true);
    hoisted.db.voiceWorkerHeartbeat.create.mockResolvedValue(undefined);
    hoisted.db.webhookEvent.create.mockResolvedValue(undefined);
  });

  it("rejects unauthorized worker heartbeats", async () => {
    hoisted.isVoiceAgentSecretAuthorized.mockReturnValue(false);

    const response = await POST(
      new NextRequest("https://earlymark.ai/api/internal/voice-agent-status", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("rejects invalid payloads", async () => {
    const response = await POST(
      new NextRequest("https://earlymark.ai/api/internal/voice-agent-status", {
        method: "POST",
        headers: { "x-voice-agent-secret": "secret" },
        body: JSON.stringify({
          runtimeFingerprint: "",
          hostId: "",
          workerRole: "",
        }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  it("stores worker heartbeats using server receipt time and preserves the worker-reported timestamp for diagnostics", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-28T08:00:00.000Z"));

    const response = await POST(
      new NextRequest("https://earlymark.ai/api/internal/voice-agent-status", {
        method: "POST",
        headers: { "x-voice-agent-secret": "secret" },
        body: JSON.stringify({
          deployGitSha: "abcdef12",
          runtimeFingerprint: "va_123",
          hostId: "host_1",
          workerRole: "tracey-sales-agent",
          surfaceSet: ["demo", "inbound_demo"],
          ready: true,
          activeCalls: 2,
          pid: 42,
          startedAt: "2026-04-27T10:00:00.000Z",
          heartbeatAt: "2026-04-27T10:05:00.000Z",
          summary: { capacity: "available" },
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(hoisted.db.voiceWorkerHeartbeat.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        hostId: "host_1",
        workerRole: "tracey-sales-agent",
        deployGitSha: "abcdef12",
        runtimeFingerprint: "va_123",
        ready: true,
        activeCalls: 2,
        heartbeatAt: new Date("2026-04-28T08:00:00.000Z"),
        summary: expect.objectContaining({
          capacity: "available",
          pid: 42,
          startedAt: "2026-04-27T10:00:00.000Z",
          reportedHeartbeatAt: "2026-04-27T10:05:00.000Z",
          receivedHeartbeatAt: "2026-04-28T08:00:00.000Z",
          reportedClockSkewMs: 78900000,
        }),
      }),
    });
    expect(hoisted.db.webhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: "livekit_worker_status",
        eventType: "heartbeat",
        status: "success",
        payload: expect.objectContaining({
          heartbeatAt: "2026-04-28T08:00:00.000Z",
          reportedHeartbeatAt: "2026-04-27T10:05:00.000Z",
          reportedClockSkewMs: 78900000,
        }),
      }),
    });
  });

  it("returns 500 on unexpected database errors", async () => {
    hoisted.db.voiceWorkerHeartbeat.create.mockRejectedValue(new Error("db offline"));

    const response = await POST(
      new NextRequest("https://earlymark.ai/api/internal/voice-agent-status", {
        method: "POST",
        headers: { "x-voice-agent-secret": "secret" },
        body: JSON.stringify({
          runtimeFingerprint: "va_123",
          hostId: "host_1",
          workerRole: "tracey-sales-agent",
        }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Internal server error" });
  });
});
