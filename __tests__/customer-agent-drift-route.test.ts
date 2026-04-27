import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  auditTwilioMessagingRouting: vi.fn(),
  auditTwilioVoiceRouting: vi.fn(),
  getVoiceAgentRuntimeDrift: vi.fn(),
  getVoiceFleetHealth: vi.fn(),
  getVoiceLatencyHealth: vi.fn(),
  combineVoiceStatuses: vi.fn(),
  isOpsAuthorized: vi.fn(),
  isVoiceAgentSecretAuthorized: vi.fn(),
}));

vi.mock("@/lib/twilio-drift", () => ({
  auditTwilioMessagingRouting: hoisted.auditTwilioMessagingRouting,
  auditTwilioVoiceRouting: hoisted.auditTwilioVoiceRouting,
}));

vi.mock("@/lib/voice-agent-runtime", () => ({
  getVoiceAgentRuntimeDrift: hoisted.getVoiceAgentRuntimeDrift,
}));

vi.mock("@/lib/voice-fleet", () => ({
  getVoiceFleetHealth: hoisted.getVoiceFleetHealth,
}));

vi.mock("@/lib/voice-call-latency-health", () => ({
  getVoiceLatencyHealth: hoisted.getVoiceLatencyHealth,
}));

vi.mock("@/lib/voice-monitoring", () => ({
  combineVoiceStatuses: hoisted.combineVoiceStatuses,
}));

vi.mock("@/lib/ops-auth", () => ({
  isOpsAuthorized: hoisted.isOpsAuthorized,
  getUnauthorizedJsonResponse: () =>
    new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }),
}));

vi.mock("@/lib/voice-agent-auth", () => ({
  isVoiceAgentSecretAuthorized: hoisted.isVoiceAgentSecretAuthorized,
}));

import { GET, POST } from "@/app/api/internal/customer-agent-drift/route";

describe("/api/internal/customer-agent-drift", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.isOpsAuthorized.mockReturnValue(true);
    hoisted.isVoiceAgentSecretAuthorized.mockReturnValue(false);
    hoisted.auditTwilioVoiceRouting.mockResolvedValue({ status: "healthy", mode: "voice" });
    hoisted.auditTwilioMessagingRouting.mockResolvedValue({ status: "degraded", mode: "messaging" });
    hoisted.getVoiceAgentRuntimeDrift.mockResolvedValue({ status: "healthy" });
    hoisted.getVoiceFleetHealth.mockResolvedValue({ status: "healthy" });
    hoisted.getVoiceLatencyHealth.mockResolvedValue({ status: "healthy" });
    hoisted.combineVoiceStatuses.mockReturnValue("healthy");
  });

  it("rejects unauthorized GET callers", async () => {
    hoisted.isOpsAuthorized.mockReturnValue(false);
    hoisted.isVoiceAgentSecretAuthorized.mockReturnValue(false);

    const response = await GET(new NextRequest("https://earlymark.ai/api/internal/customer-agent-drift"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("allows voice-agent-authenticated GET callers and downgrades status when messaging is degraded", async () => {
    hoisted.isOpsAuthorized.mockReturnValue(false);
    hoisted.isVoiceAgentSecretAuthorized.mockReturnValue(true);

    const response = await GET(
      new NextRequest("https://earlymark.ai/api/internal/customer-agent-drift", {
        headers: { "x-voice-agent-secret": "secret" },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("degraded");
    expect(hoisted.auditTwilioVoiceRouting).toHaveBeenCalledWith({ apply: false });
    expect(hoisted.auditTwilioMessagingRouting).toHaveBeenCalledWith({ apply: false });
  });

  it("POST applies drift fixes and returns 500 when the final status is unhealthy", async () => {
    hoisted.auditTwilioVoiceRouting.mockResolvedValue({ status: "healthy", apply: true });
    hoisted.auditTwilioMessagingRouting.mockResolvedValue({ status: "unhealthy", apply: true });

    const response = await POST(
      new NextRequest("https://earlymark.ai/api/internal/customer-agent-drift"),
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.status).toBe("unhealthy");
    expect(hoisted.auditTwilioVoiceRouting).toHaveBeenCalledWith({ apply: true });
    expect(hoisted.auditTwilioMessagingRouting).toHaveBeenCalledWith({ apply: true });
  });
});
