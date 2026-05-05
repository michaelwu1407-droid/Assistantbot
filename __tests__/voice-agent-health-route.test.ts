import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  recordMonitorRun,
  isOpsAuthorized,
  dispatchVoiceIncidentNotifications,
  runVoiceAgentHealthMonitor,
  getVoiceAgentHealthMonitorSummary,
  buildVoiceAgentHealthMonitorDetails,
} = vi.hoisted(() => ({
  recordMonitorRun: vi.fn(),
  isOpsAuthorized: vi.fn(),
  dispatchVoiceIncidentNotifications: vi.fn(),
  runVoiceAgentHealthMonitor: vi.fn(),
  getVoiceAgentHealthMonitorSummary: vi.fn(),
  buildVoiceAgentHealthMonitorDetails: vi.fn(),
}));

vi.mock("@/lib/ops-monitor-runs", () => ({
  recordMonitorRun,
}));

vi.mock("@/lib/ops-auth", () => ({
  isOpsAuthorized,
  getUnauthorizedJsonResponse: () =>
    new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }),
}));

vi.mock("@/lib/voice-incident-alert", () => ({
  dispatchVoiceIncidentNotifications,
}));

vi.mock("@/lib/voice-agent-health-monitor", () => ({
  runVoiceAgentHealthMonitor,
  getVoiceAgentHealthMonitorSummary,
  buildVoiceAgentHealthMonitorDetails,
}));

import { GET } from "@/app/api/cron/voice-agent-health/route";

describe("GET /api/cron/voice-agent-health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isOpsAuthorized.mockReturnValue(true);
    recordMonitorRun.mockResolvedValue(undefined);
    dispatchVoiceIncidentNotifications.mockResolvedValue(null);
    getVoiceAgentHealthMonitorSummary.mockReturnValue("Voice agent health monitor completed with unhealthy status");
    buildVoiceAgentHealthMonitorDetails.mockReturnValue({
      checkedAt: "2026-04-27T14:26:21.531Z",
      fleetStatus: "healthy",
      customerSaturationStatus: "healthy",
      twilioRoutingStatus: "healthy",
      livekitSipStatus: "unhealthy",
      invariantStatus: "healthy",
      recentCallsStatus: "healthy",
      latencyStatus: "healthy",
      primaryIssue: {
        key: "livekitSip",
        status: "unhealthy",
        summary: "No LiveKit SIP dispatch rules are configured.",
        warnings: ["No LiveKit SIP dispatch rules are configured."],
      },
      nonHealthyChecks: [
        {
          key: "livekitSip",
          status: "unhealthy",
          summary: "No LiveKit SIP dispatch rules are configured.",
          warnings: ["No LiveKit SIP dispatch rules are configured."],
        },
      ],
      incidentCounts: { opened: 1, resolved: 0 },
    });
  });

  it("persists enriched monitor details for unhealthy runs", async () => {
    runVoiceAgentHealthMonitor.mockResolvedValue({
      status: "unhealthy",
      checkedAt: "2026-04-27T14:26:21.531Z",
      fleet: { status: "healthy" },
      customerSaturation: { status: "healthy" },
      twilioRouting: { status: "healthy" },
      livekitSip: { status: "unhealthy" },
      invariants: { status: "healthy" },
      recentCalls: { status: "healthy" },
      latency: { status: "healthy" },
      incidents: { opened: ["voice:livekit:sip"], resolved: [] },
    });

    const response = await GET(new NextRequest("https://app.example.com/api/cron/voice-agent-health"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(buildVoiceAgentHealthMonitorDetails).toHaveBeenCalledTimes(1);
    expect(recordMonitorRun).toHaveBeenCalledWith(
      expect.objectContaining({
        monitorKey: "voice-agent-health",
        status: "unhealthy",
        details: expect.objectContaining({
          livekitSipStatus: "unhealthy",
          primaryIssue: expect.objectContaining({
            key: "livekitSip",
          }),
        }),
      }),
    );
    expect(body.status).toBe("unhealthy");
    expect(body.livekitSip.status).toBe("unhealthy");
  });

  it("rejects unauthorized callers", async () => {
    isOpsAuthorized.mockReturnValue(false);

    const response = await GET(new NextRequest("https://app.example.com/api/cron/voice-agent-health"));

    expect(response.status).toBe(403);
    expect(runVoiceAgentHealthMonitor).not.toHaveBeenCalled();
  });
});
