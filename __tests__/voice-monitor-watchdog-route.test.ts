import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getMonitorRunHealth,
  recordMonitorRun,
  isOpsAuthorized,
  dispatchVoiceIncidentNotifications,
  reconcileVoiceIncidents,
  buildMonitorIncidentObservations,
  runVoiceAgentHealthMonitor,
  getVoiceAgentHealthMonitorSummary,
} = vi.hoisted(() => ({
  getMonitorRunHealth: vi.fn(),
  recordMonitorRun: vi.fn(),
  isOpsAuthorized: vi.fn(),
  dispatchVoiceIncidentNotifications: vi.fn(),
  reconcileVoiceIncidents: vi.fn(),
  buildMonitorIncidentObservations: vi.fn(),
  runVoiceAgentHealthMonitor: vi.fn(),
  getVoiceAgentHealthMonitorSummary: vi.fn(),
}));

vi.mock("@/lib/ops-monitor-runs", () => ({
  getMonitorRunHealth,
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

vi.mock("@/lib/voice-incidents", () => ({
  reconcileVoiceIncidents,
}));

vi.mock("@/lib/voice-monitoring", () => ({
  buildMonitorIncidentObservations,
}));

vi.mock("@/lib/voice-agent-health-monitor", () => ({
  runVoiceAgentHealthMonitor,
  getVoiceAgentHealthMonitorSummary,
}));

import { GET } from "@/app/api/cron/voice-monitor-watchdog/route";

describe("GET /api/cron/voice-monitor-watchdog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isOpsAuthorized.mockReturnValue(true);
    recordMonitorRun.mockResolvedValue(undefined);
    reconcileVoiceIncidents.mockResolvedValue([]);
    dispatchVoiceIncidentNotifications.mockResolvedValue(null);
    buildMonitorIncidentObservations.mockReturnValue([]);
    getVoiceAgentHealthMonitorSummary.mockReturnValue("Voice agent health monitor completed successfully");
  });

  it("refreshes voice-agent-health inline when the last successful run is stale", async () => {
    getMonitorRunHealth
      .mockResolvedValueOnce({
        monitorKey: "voice-agent-health",
        status: "unhealthy",
        summary: "voice-agent-health last succeeded 24 minute(s) ago, beyond the 15-minute window.",
        warnings: ["stale"],
        checkedAt: "2026-03-12T14:03:32.452Z",
        lastSuccessAt: "2026-03-12T13:39:53.112Z",
        lastFailureAt: null,
        ageMs: 1_419_409,
        staleAfterMs: 900_000,
      })
      .mockResolvedValueOnce({
        monitorKey: "voice-agent-health",
        status: "healthy",
        summary: "voice-agent-health is reporting on schedule",
        warnings: [],
        checkedAt: "2026-03-12T14:03:40.000Z",
        lastSuccessAt: "2026-03-12T14:03:39.000Z",
        lastFailureAt: null,
        ageMs: 1_000,
        staleAfterMs: 900_000,
      });
    runVoiceAgentHealthMonitor.mockResolvedValue({
      status: "healthy",
      checkedAt: "2026-03-12T14:03:39.000Z",
      fleet: { status: "healthy" },
      customerSaturation: { status: "healthy" },
      twilioRouting: { status: "healthy" },
      invariants: { status: "healthy" },
      recentCalls: { status: "healthy" },
      latency: { status: "healthy" },
      incidents: [],
    });

    const response = await GET(new NextRequest("https://app.example.com/api/cron/voice-monitor-watchdog"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(runVoiceAgentHealthMonitor).toHaveBeenCalledTimes(1);
    expect(getMonitorRunHealth).toHaveBeenCalledTimes(2);
    expect(recordMonitorRun).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        monitorKey: "voice-agent-health",
        status: "healthy",
        succeeded: true,
      }),
    );
    expect(recordMonitorRun).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        monitorKey: "voice-monitor-watchdog",
        status: "healthy",
        succeeded: true,
      }),
    );
    expect(body.status).toBe("healthy");
    expect(body.refreshedVoiceAgentHealthRun.status).toBe("healthy");
  });

  it("refreshes voice-agent-health inline when the last run is still fresh but degraded", async () => {
    getMonitorRunHealth
      .mockResolvedValueOnce({
        monitorKey: "voice-agent-health",
        status: "degraded",
        summary: "voice-agent-health is reporting on schedule but last reported degraded",
        warnings: ["degraded"],
        checkedAt: "2026-03-12T14:03:32.452Z",
        lastSuccessAt: "2026-03-12T14:03:31.112Z",
        lastFailureAt: null,
        ageMs: 1_340,
        staleAfterMs: 420_000,
      })
      .mockResolvedValueOnce({
        monitorKey: "voice-agent-health",
        status: "healthy",
        summary: "voice-agent-health is reporting on schedule",
        warnings: [],
        checkedAt: "2026-03-12T14:03:40.000Z",
        lastSuccessAt: "2026-03-12T14:03:39.000Z",
        lastFailureAt: null,
        ageMs: 1_000,
        staleAfterMs: 420_000,
      });
    runVoiceAgentHealthMonitor.mockResolvedValue({
      status: "healthy",
      checkedAt: "2026-03-12T14:03:39.000Z",
      fleet: { status: "healthy" },
      customerSaturation: { status: "healthy" },
      twilioRouting: { status: "healthy" },
      invariants: { status: "healthy" },
      recentCalls: { status: "healthy" },
      latency: { status: "healthy" },
      incidents: [],
    });

    const response = await GET(new NextRequest("https://app.example.com/api/cron/voice-monitor-watchdog"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(runVoiceAgentHealthMonitor).toHaveBeenCalledTimes(1);
    expect(body.refreshedVoiceAgentHealthRun.status).toBe("healthy");
  });

  it("rejects unauthorized callers", async () => {
    isOpsAuthorized.mockReturnValue(false);

    const response = await GET(new NextRequest("https://app.example.com/api/cron/voice-monitor-watchdog"));

    expect(response.status).toBe(403);
    expect(getMonitorRunHealth).not.toHaveBeenCalled();
    expect(runVoiceAgentHealthMonitor).not.toHaveBeenCalled();
  });
});
