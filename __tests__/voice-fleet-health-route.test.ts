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
  getDemoCallHealth,
  getOutboundCallHealth,
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
  getDemoCallHealth: vi.fn(),
  getOutboundCallHealth: vi.fn(),
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

vi.mock("@/lib/demo-call-health", () => ({
  getDemoCallHealth,
}));

vi.mock("@/lib/outbound-call-health", () => ({
  getOutboundCallHealth,
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
    getDemoCallHealth.mockResolvedValue({ status: "healthy" });
    getOutboundCallHealth.mockResolvedValue({ status: "healthy" });
    combineVoiceStatuses.mockImplementation((statuses) =>
      statuses.includes("unhealthy") ? "unhealthy" : statuses.includes("degraded") ? "degraded" : "healthy",
    );
  });

  it("lets the active spoken probe influence internal voice status alongside the passive monitors", async () => {
    getMonitorRunHealth
      .mockResolvedValueOnce({ monitorKey: "voice-agent-health", status: "healthy" })
      .mockResolvedValueOnce({ monitorKey: "voice-monitor-watchdog", status: "healthy" })
      .mockResolvedValueOnce({ monitorKey: "passive-communications-health", status: "healthy" })
      .mockResolvedValueOnce({ monitorKey: "voice-synthetic-probe", status: "unhealthy" });

    const response = await GET(new NextRequest("https://app.example.com/api/internal/voice-fleet-health"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(getMonitorRunHealth).toHaveBeenNthCalledWith(1, "voice-agent-health", 1_800_000);
    expect(getMonitorRunHealth).toHaveBeenNthCalledWith(2, "voice-monitor-watchdog", 1_800_000);
    expect(getMonitorRunHealth).toHaveBeenNthCalledWith(3, "passive-communications-health", 1_800_000);
    expect(getMonitorRunHealth).toHaveBeenNthCalledWith(4, "voice-synthetic-probe", 2_700_000);
    expect(combineVoiceStatuses).toHaveBeenNthCalledWith(1, [
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
      "unhealthy",
    ]);
    expect(combineVoiceStatuses).toHaveBeenNthCalledWith(2, [
      "healthy",
      "healthy",
    ]);
    expect(combineVoiceStatuses).toHaveBeenNthCalledWith(3, [
      "healthy",
      "healthy",
      "healthy",
    ]);
    expect(combineVoiceStatuses).toHaveBeenNthCalledWith(4, [
      "unhealthy",
      "healthy",
      "healthy",
    ]);
    expect(body.monitorHealth.monitorKey).toBe("voice-agent-health");
    expect(body.watchdogHealth.monitorKey).toBe("voice-monitor-watchdog");
    expect(body.passiveMonitorHealth.monitorKey).toBe("passive-communications-health");
    expect(body.probeHealth.monitorKey).toBe("voice-synthetic-probe");
    expect(body.passiveProduction.status).toBe("healthy");
    expect(body.status).toBe("unhealthy");
    expect(body.voiceStatus).toBe("unhealthy");
    expect(body.overallStatus).toBe("unhealthy");
  });

  it("keeps the core voice status healthy when only passive customer SMS health is degraded", async () => {
    getPassiveProductionHealth.mockResolvedValue({
      status: "unhealthy",
      voice: { status: "healthy" },
      sms: { status: "unhealthy" },
      email: { status: "healthy" },
    });
    getMonitorRunHealth
      .mockResolvedValueOnce({ monitorKey: "voice-agent-health", status: "healthy" })
      .mockResolvedValueOnce({ monitorKey: "voice-monitor-watchdog", status: "healthy" })
      .mockResolvedValueOnce({ monitorKey: "passive-communications-health", status: "unhealthy" })
      .mockResolvedValueOnce({ monitorKey: "voice-synthetic-probe", status: "healthy" });

    const response = await GET(new NextRequest("https://app.example.com/api/internal/voice-fleet-health"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.voiceStatus).toBe("healthy");
    expect(body.communicationsStatus).toBe("unhealthy");
    expect(body.monitoringStatus).toBe("unhealthy");
    expect(body.overallStatus).toBe("unhealthy");
  });
});
