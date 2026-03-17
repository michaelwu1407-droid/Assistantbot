import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  isOpsAuthorized,
  recordMonitorRun,
  getPassiveProductionHealth,
} = vi.hoisted(() => ({
  isOpsAuthorized: vi.fn(),
  recordMonitorRun: vi.fn(),
  getPassiveProductionHealth: vi.fn(),
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
  recordMonitorRun,
}));

vi.mock("@/lib/passive-production-health", () => ({
  getPassiveProductionHealth,
}));

import { GET } from "@/app/api/cron/passive-communications-health/route";

describe("GET /api/cron/passive-communications-health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isOpsAuthorized.mockReturnValue(true);
    recordMonitorRun.mockResolvedValue(undefined);
    getPassiveProductionHealth.mockResolvedValue({
      status: "degraded",
      summary: "No recent persisted Earlymark inbound voice calls were observed.",
      warnings: ["No recent persisted Earlymark inbound voice calls were observed."],
      checkedAt: "2026-03-17T12:00:00.000Z",
      signalLookbackDays: 7,
      activeWorkspaceLookbackDays: 14,
      recentTwilioFailureLookbackMinutes: 360,
      recentEmailFailureLookbackHours: 24,
      recentSmsFailureLookbackHours: 24,
      voice: {
        status: "degraded",
        summary: "No recent persisted Earlymark inbound voice calls were observed.",
        warnings: ["No recent persisted Earlymark inbound voice calls were observed."],
        earlymark: {
          status: "degraded",
          classification: "unknown",
          summary: "No recent persisted Earlymark inbound voice calls were observed.",
          warnings: ["No recent persisted Earlymark inbound voice calls were observed."],
          configured: true,
          lastSuccessAt: null,
          lastFailureAt: null,
          recentSuccessCount: 0,
          recentFailureCount: 0,
        },
        activeWorkspaceCount: 1,
        failureWorkspaceCount: 0,
        unknownWorkspaceCount: 2,
      },
      sms: {
        status: "healthy",
        summary: "No recent real inbound SMS failure signals were observed.",
        warnings: [],
        activeWorkspaceCount: 1,
        failureWorkspaceCount: 0,
        unknownWorkspaceCount: 1,
        recentInboundSmsSuccessCount: 0,
        recentInboundSmsFailureCount: 0,
        recentReplySmsSuccessCount: 0,
        recentReplySmsFailureCount: 0,
      },
      email: {
        status: "healthy",
        summary: "No recent real inbound email failure signals were observed.",
        warnings: [],
        activeWorkspaceCount: 1,
        failureWorkspaceCount: 0,
        unknownWorkspaceCount: 1,
        recentInboundEmailSuccessCount: 3,
        recentInboundEmailFailureCount: 0,
      },
      activeWorkspaceCount: 1,
      unhealthyActiveWorkspaceCount: 0,
      unknownWorkspaceCount: 2,
      workspaceRows: [],
    });
  });

  it("records passive production health and does not fail on degraded unknown traffic", async () => {
    const response = await GET(new NextRequest("https://app.example.com/api/cron/passive-communications-health"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("degraded");
    expect(recordMonitorRun).toHaveBeenCalledWith(
      expect.objectContaining({
        monitorKey: "passive-communications-health",
        status: "degraded",
        summary: "No recent persisted Earlymark inbound voice calls were observed.",
        details: expect.objectContaining({
          smsStatus: "healthy",
        }),
      }),
    );
  });

  it("rejects unauthorized callers", async () => {
    isOpsAuthorized.mockReturnValue(false);

    const response = await GET(new NextRequest("https://app.example.com/api/cron/passive-communications-health"));

    expect(response.status).toBe(403);
    expect(getPassiveProductionHealth).not.toHaveBeenCalled();
  });
});
