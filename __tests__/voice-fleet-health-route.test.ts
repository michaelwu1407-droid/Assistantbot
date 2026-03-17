import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  isOpsAuthorized,
  getMonitorRunHealth,
  auditTwilioVoiceRouting,
  getVoiceBusinessInvariantHealth,
  getVoiceFleetHealth,
  getVoiceSurfaceSaturationHealth,
  getTwilioVoiceCallHealth,
  getVoiceLatencyHealth,
  getPassiveProductionHealth,
  getLivekitSipHealth,
  combineVoiceStatuses,
  isVoiceAgentSecretAuthorized,
} = vi.hoisted(() => ({
  isOpsAuthorized: vi.fn(),
  getMonitorRunHealth: vi.fn(),
  auditTwilioVoiceRouting: vi.fn(),
  getVoiceBusinessInvariantHealth: vi.fn(),
  getVoiceFleetHealth: vi.fn(),
  getVoiceSurfaceSaturationHealth: vi.fn(),
  getTwilioVoiceCallHealth: vi.fn(),
  getVoiceLatencyHealth: vi.fn(),
  getPassiveProductionHealth: vi.fn(),
  getLivekitSipHealth: vi.fn(),
  combineVoiceStatuses: vi.fn(),
  isVoiceAgentSecretAuthorized: vi.fn(),
}));

vi.mock("@/lib/ops-auth", () => ({
  isOpsAuthorized,
  getUnauthorizedJsonResponse: () =>
    new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }),
}));

vi.mock("@/lib/ops-monitor-runs", () => ({
  getMonitorRunHealth,
}));

vi.mock("@/lib/twilio-drift", () => ({
  auditTwilioVoiceRouting,
}));

vi.mock("@/lib/voice-business-invariants", () => ({
  getVoiceBusinessInvariantHealth,
}));

vi.mock("@/lib/voice-fleet", () => ({
  getVoiceFleetHealth,
  getVoiceSurfaceSaturationHealth,
}));

vi.mock("@/lib/twilio-voice-call-health", () => ({
  getTwilioVoiceCallHealth,
}));

vi.mock("@/lib/voice-call-latency-health", () => ({
  getVoiceLatencyHealth,
}));

vi.mock("@/lib/passive-production-health", () => ({
  getPassiveProductionHealth,
}));

vi.mock("@/lib/livekit-sip-health", () => ({
  getLivekitSipHealth,
}));

vi.mock("@/lib/voice-monitoring", () => ({
  combineVoiceStatuses,
}));

vi.mock("@/lib/voice-agent-auth", () => ({
  isVoiceAgentSecretAuthorized,
}));

import { GET } from "@/app/api/internal/voice-fleet-health/route";

describe("GET /api/internal/voice-fleet-health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isOpsAuthorized.mockReturnValue(true);
    isVoiceAgentSecretAuthorized.mockReturnValue(false);
    getVoiceFleetHealth.mockResolvedValue({ status: "healthy" });
    getVoiceSurfaceSaturationHealth.mockResolvedValue({ status: "healthy" });
    auditTwilioVoiceRouting.mockResolvedValue({ status: "healthy" });
    getVoiceBusinessInvariantHealth.mockResolvedValue({ status: "healthy" });
    getTwilioVoiceCallHealth.mockResolvedValue({ status: "healthy" });
    getVoiceLatencyHealth.mockResolvedValue({ status: "healthy" });
    getPassiveProductionHealth.mockResolvedValue({
      status: "healthy",
      voice: { status: "healthy" },
      sms: { status: "healthy" },
      email: { status: "healthy" },
    });
    getLivekitSipHealth.mockResolvedValue({ status: "healthy" });
    getMonitorRunHealth
      .mockResolvedValueOnce({ monitorKey: "voice-agent-health", status: "healthy" })
      .mockResolvedValueOnce({ monitorKey: "voice-monitor-watchdog", status: "healthy" })
      .mockResolvedValueOnce({ monitorKey: "passive-communications-health", status: "healthy" })
      .mockResolvedValueOnce({ monitorKey: "voice-synthetic-probe", status: "unhealthy" });
    combineVoiceStatuses.mockImplementation((statuses) =>
      statuses.includes("unhealthy") ? "unhealthy" : statuses.includes("degraded") ? "degraded" : "healthy",
    );
  });

  it("reports passive production health separately and does not let the active probe drive routine voice status", async () => {
    const response = await GET(new NextRequest("https://app.example.com/api/internal/voice-fleet-health"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getMonitorRunHealth).toHaveBeenNthCalledWith(1, "voice-agent-health", 420000);
    expect(getMonitorRunHealth).toHaveBeenNthCalledWith(2, "voice-monitor-watchdog", 420000);
    expect(getMonitorRunHealth).toHaveBeenNthCalledWith(3, "passive-communications-health", 420000);
    expect(getMonitorRunHealth).toHaveBeenNthCalledWith(4, "voice-synthetic-probe", 420000);
    expect(combineVoiceStatuses).toHaveBeenCalledWith([
      "healthy",
      "healthy",
      "healthy",
      "healthy",
      "healthy",
      "healthy",
      "healthy",
      "healthy",
      "healthy",
      "healthy",
      "healthy",
    ]);
    expect(body.monitorHealth.monitorKey).toBe("voice-agent-health");
    expect(body.watchdogHealth.monitorKey).toBe("voice-monitor-watchdog");
    expect(body.passiveMonitorHealth.monitorKey).toBe("passive-communications-health");
    expect(body.probeHealth.monitorKey).toBe("voice-synthetic-probe");
    expect(body.passiveProduction.status).toBe("healthy");
    expect(body.status).toBe("healthy");
  });
});
