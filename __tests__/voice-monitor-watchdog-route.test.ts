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
  buildVoiceAgentHealthMonitorDetails,
  getPassiveProductionHealth,
  runVoiceSyntheticProbe,
} = vi.hoisted(() => ({
  getMonitorRunHealth: vi.fn(),
  recordMonitorRun: vi.fn(),
  isOpsAuthorized: vi.fn(),
  dispatchVoiceIncidentNotifications: vi.fn(),
  reconcileVoiceIncidents: vi.fn(),
  buildMonitorIncidentObservations: vi.fn(),
  runVoiceAgentHealthMonitor: vi.fn(),
  getVoiceAgentHealthMonitorSummary: vi.fn(),
  buildVoiceAgentHealthMonitorDetails: vi.fn(),
  getPassiveProductionHealth: vi.fn(),
  runVoiceSyntheticProbe: vi.fn(),
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
  buildVoiceAgentHealthMonitorDetails,
}));

vi.mock("@/lib/passive-production-health", () => ({
  getPassiveProductionHealth,
}));

vi.mock("@/lib/voice-synthetic-probe", () => ({
  runVoiceSyntheticProbe,
}));

import { GET } from "@/app/api/cron/voice-monitor-watchdog/route";

function monitorHealth(overrides: Record<string, unknown>) {
  return {
    monitorKey: "unknown",
    status: "healthy",
    summary: "monitor healthy",
    warnings: [],
    checkedAt: "2026-03-12T14:03:40.000Z",
    lastSuccessAt: "2026-03-12T14:03:39.000Z",
    lastFailureAt: null,
    ageMs: 1_000,
    staleAfterMs: 1_800_000,
    ...overrides,
  };
}

function healthyVoiceAgentRun() {
  return {
    status: "healthy",
    checkedAt: "2026-03-12T14:03:39.000Z",
    fleet: { status: "healthy" },
    customerSaturation: { status: "healthy" },
    twilioRouting: { status: "healthy" },
    livekitSip: { status: "healthy" },
    invariants: { status: "healthy" },
    recentCalls: { status: "healthy" },
    latency: { status: "healthy" },
    incidents: [],
  };
}

describe("GET /api/cron/voice-monitor-watchdog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isOpsAuthorized.mockReturnValue(true);
    recordMonitorRun.mockResolvedValue(undefined);
    reconcileVoiceIncidents.mockResolvedValue([]);
    dispatchVoiceIncidentNotifications.mockResolvedValue(null);
    buildMonitorIncidentObservations.mockReturnValue([]);
    getVoiceAgentHealthMonitorSummary.mockReturnValue("Voice agent health monitor completed successfully");
    buildVoiceAgentHealthMonitorDetails.mockReturnValue({
      checkedAt: "2026-03-12T14:03:39.000Z",
      livekitSipStatus: "healthy",
      nonHealthyChecks: [],
      primaryIssue: null,
      incidentCounts: { opened: 0, resolved: 0 },
    });
    getPassiveProductionHealth.mockResolvedValue({
      status: "healthy",
      summary: "Passive production traffic looks healthy.",
      checkedAt: "2026-03-12T14:03:39.000Z",
      voice: { status: "healthy" },
      sms: { status: "healthy" },
      email: { status: "healthy" },
      activeWorkspaceCount: 1,
      unhealthyActiveWorkspaceCount: 0,
      unknownWorkspaceCount: 0,
    });
    runVoiceSyntheticProbe.mockResolvedValue({
      status: "healthy",
      checkedAt: "2026-03-12T14:03:39.000Z",
      summary: "Synthetic Earlymark inbound probe passed.",
      skipped: false,
      probeResult: "pass",
      probeCaller: "+61434955958",
      probeCallerSource: "VOICE_MONITOR_PROBE_CALLER_NUMBER",
      targetNumber: "+61485010634",
      targetNumberSource: "known_inbound_env",
      gatewayUrl: "https://app.example.com/api/webhooks/twilio-voice-gateway",
      expectedSipTarget: "sip:+61485010634@live.earlymark.ai:5060",
      responseStatus: 200,
      gatewayProbe: {
        result: "pass",
        responseStatus: 200,
        twiml: "<Response><Dial><Sip>sip:+61485010634@live.earlymark.ai:5060</Sip></Dial></Response>",
      },
      spokenCanary: {
        status: "healthy",
        summary: "spoken canary healthy",
      },
      incidents: [],
      details: {
        checkedAt: "2026-03-12T14:03:39.000Z",
        probeResult: "pass",
      },
    });
  });

  it("refreshes voice-agent-health inline when the last successful run is stale", async () => {
    getMonitorRunHealth
      .mockResolvedValueOnce(
        monitorHealth({
          monitorKey: "voice-agent-health",
          status: "unhealthy",
          summary: "voice-agent-health last succeeded 24 minute(s) ago, beyond the 30-minute window.",
          warnings: ["stale"],
          checkedAt: "2026-03-12T14:03:32.452Z",
          lastSuccessAt: "2026-03-12T13:39:53.112Z",
          ageMs: 1_900_000,
        }),
      )
      .mockResolvedValueOnce(
        monitorHealth({
          monitorKey: "passive-communications-health",
          status: "healthy",
          summary: "passive-communications-health is reporting on schedule",
        }),
      )
      .mockResolvedValueOnce(
        monitorHealth({
          monitorKey: "voice-synthetic-probe",
          status: "healthy",
          summary: "voice-synthetic-probe is reporting on schedule",
          staleAfterMs: 2_700_000,
        }),
      )
      .mockResolvedValueOnce(
        monitorHealth({
          monitorKey: "voice-agent-health",
          status: "healthy",
          summary: "voice-agent-health is reporting on schedule",
        }),
      );
    runVoiceAgentHealthMonitor.mockResolvedValue(healthyVoiceAgentRun());

    const response = await GET(new NextRequest("https://app.example.com/api/cron/voice-monitor-watchdog"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(runVoiceSyntheticProbe).not.toHaveBeenCalled();
    expect(runVoiceAgentHealthMonitor).toHaveBeenCalledTimes(1);
    expect(getMonitorRunHealth).toHaveBeenCalledTimes(4);
    expect(recordMonitorRun).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        monitorKey: "voice-agent-health",
        status: "healthy",
        details: expect.objectContaining({
          livekitSipStatus: "healthy",
        }),
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

  it("refreshes passive communications health inline when it is stale", async () => {
    getMonitorRunHealth
      .mockResolvedValueOnce(
        monitorHealth({
          monitorKey: "voice-agent-health",
          status: "healthy",
          summary: "voice-agent-health is reporting on schedule",
        }),
      )
      .mockResolvedValueOnce(
        monitorHealth({
          monitorKey: "passive-communications-health",
          status: "unhealthy",
          summary: "passive-communications-health last succeeded 31 minute(s) ago, beyond the 30-minute window.",
          warnings: ["stale"],
          checkedAt: "2026-03-12T14:03:32.452Z",
          lastSuccessAt: "2026-03-12T13:31:53.112Z",
          ageMs: 1_900_000,
        }),
      )
      .mockResolvedValueOnce(
        monitorHealth({
          monitorKey: "voice-synthetic-probe",
          status: "healthy",
          summary: "voice-synthetic-probe is reporting on schedule",
          staleAfterMs: 2_700_000,
        }),
      )
      .mockResolvedValueOnce(
        monitorHealth({
          monitorKey: "passive-communications-health",
          status: "healthy",
          summary: "passive-communications-health is reporting on schedule",
        }),
      );

    const response = await GET(new NextRequest("https://app.example.com/api/cron/voice-monitor-watchdog"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(runVoiceSyntheticProbe).not.toHaveBeenCalled();
    expect(runVoiceAgentHealthMonitor).not.toHaveBeenCalled();
    expect(getPassiveProductionHealth).toHaveBeenCalledTimes(1);
    expect(recordMonitorRun).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        monitorKey: "passive-communications-health",
        status: "healthy",
        details: expect.objectContaining({
          emailStatus: "healthy",
          refreshedBy: "voice-monitor-watchdog",
        }),
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
    expect(body.refreshedPassiveTrafficRun.status).toBe("healthy");
  });

  it("refreshes voice-agent-health inline when the last run is still fresh but degraded", async () => {
    getMonitorRunHealth
      .mockResolvedValueOnce(
        monitorHealth({
          monitorKey: "voice-agent-health",
          status: "degraded",
          summary: "voice-agent-health is reporting on schedule but last reported degraded",
          warnings: ["degraded"],
          checkedAt: "2026-03-12T14:03:32.452Z",
          lastSuccessAt: "2026-03-12T14:03:31.112Z",
          ageMs: 1_340,
        }),
      )
      .mockResolvedValueOnce(
        monitorHealth({
          monitorKey: "passive-communications-health",
          status: "healthy",
          summary: "passive-communications-health is reporting on schedule",
        }),
      )
      .mockResolvedValueOnce(
        monitorHealth({
          monitorKey: "voice-synthetic-probe",
          status: "healthy",
          summary: "voice-synthetic-probe is reporting on schedule",
          staleAfterMs: 2_700_000,
        }),
      )
      .mockResolvedValueOnce(
        monitorHealth({
          monitorKey: "voice-agent-health",
          status: "healthy",
          summary: "voice-agent-health is reporting on schedule",
        }),
      );
    runVoiceAgentHealthMonitor.mockResolvedValue(healthyVoiceAgentRun());

    const response = await GET(new NextRequest("https://app.example.com/api/cron/voice-monitor-watchdog"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(runVoiceSyntheticProbe).not.toHaveBeenCalled();
    expect(runVoiceAgentHealthMonitor).toHaveBeenCalledTimes(1);
    expect(body.refreshedVoiceAgentHealthRun.status).toBe("healthy");
  });

  it("refreshes the spoken probe inline on cadence without rerunning healthy voice-agent-health", async () => {
    getMonitorRunHealth
      .mockResolvedValueOnce(
        monitorHealth({
          monitorKey: "voice-agent-health",
          status: "healthy",
          summary: "voice-agent-health is reporting on schedule",
          lastSuccessAt: "2026-03-12T14:00:39.000Z",
          ageMs: 180_000,
        }),
      )
      .mockResolvedValueOnce(
        monitorHealth({
          monitorKey: "passive-communications-health",
          status: "healthy",
          summary: "passive-communications-health is reporting on schedule",
        }),
      )
      .mockResolvedValueOnce(
        monitorHealth({
          monitorKey: "voice-synthetic-probe",
          status: "healthy",
          summary: "voice-synthetic-probe is reporting on schedule",
          lastSuccessAt: "2026-03-12T13:47:39.000Z",
          ageMs: 960_000,
          staleAfterMs: 2_700_000,
        }),
      )
      .mockResolvedValueOnce(
        monitorHealth({
          monitorKey: "voice-synthetic-probe",
          status: "healthy",
          summary: "voice-synthetic-probe is reporting on schedule",
          staleAfterMs: 2_700_000,
        }),
      );

    const response = await GET(new NextRequest("https://app.example.com/api/cron/voice-monitor-watchdog"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(runVoiceSyntheticProbe).toHaveBeenCalledTimes(1);
    expect(runVoiceAgentHealthMonitor).not.toHaveBeenCalled();
    expect(recordMonitorRun).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        monitorKey: "voice-synthetic-probe",
        status: "healthy",
        details: expect.objectContaining({
          refreshedBy: "voice-monitor-watchdog",
        }),
      }),
    );
    expect(body.refreshedSyntheticProbeRun.status).toBe("healthy");
    expect(body.refreshedVoiceAgentHealthRun).toBeNull();
  });

  it("rejects unauthorized callers", async () => {
    isOpsAuthorized.mockReturnValue(false);

    const response = await GET(new NextRequest("https://app.example.com/api/cron/voice-monitor-watchdog"));

    expect(response.status).toBe(403);
    expect(getMonitorRunHealth).not.toHaveBeenCalled();
    expect(runVoiceAgentHealthMonitor).not.toHaveBeenCalled();
  });
});
