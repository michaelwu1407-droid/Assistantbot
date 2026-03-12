import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  performOpsHealthAudit,
  isOpsAuthorized,
  recordMonitorRun,
} = vi.hoisted(() => ({
  performOpsHealthAudit: vi.fn(),
  isOpsAuthorized: vi.fn(),
  recordMonitorRun: vi.fn(),
}));

vi.mock("@/lib/health-check", () => ({
  performOpsHealthAudit,
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

import { GET } from "@/app/api/cron/customer-agent-reconcile/route";

describe("GET /api/cron/customer-agent-reconcile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordMonitorRun.mockResolvedValue(undefined);
  });

  it("returns readiness data and records the combined monitor run", async () => {
    isOpsAuthorized.mockReturnValue(true);
    performOpsHealthAudit.mockResolvedValue({
      status: "degraded",
      summary: "Twilio messaging routing drift detected",
      checkedAt: "2026-03-12T00:00:00.000Z",
      environment: {
        valid: false,
        missing: [],
        warnings: ["NEXT_PUBLIC_APP_URL is missing; Twilio voice/SMS callbacks and diagnostics may drift"],
      },
      database: {
        status: "healthy",
        latency: 12,
        timestamp: new Date("2026-03-12T00:00:00.000Z"),
      },
      twilioVoiceRouting: {
        status: "healthy",
        summary: "voice ready",
        expectedVoiceGatewayUrl: "https://app.example.com/api/webhooks/twilio-voice-gateway",
        numbers: [],
        warnings: [],
        managedNumberCount: 0,
        orphanedNumbers: [],
      },
      twilioMessagingRouting: {
        status: "degraded",
        summary: "messaging drift",
        expectedSmsWebhookUrl: "https://app.example.com/api/twilio/webhook",
        numbers: [],
        warnings: ["messaging drift"],
        managedNumberCount: 0,
        orphanedNumbers: [],
      },
      voiceWorker: {
        status: "healthy",
        summary: "worker ready",
        warnings: [],
        expectedFingerprint: "va_test",
        latestHeartbeat: null,
      },
      readiness: {
        overallStatus: "degraded",
        checks: {
          inboundVoice: {
            status: "healthy",
            missing: [],
            warnings: [],
            summary: "ready",
          },
          smsInbound: {
            status: "degraded",
            missing: [],
            warnings: ["messaging drift"],
            summary: "messaging drift",
          },
        },
      },
    });

    const response = await GET(new Request("https://app.example.com/api/cron/customer-agent-reconcile"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("degraded");
    expect(body.readiness.overallStatus).toBe("degraded");
    expect(recordMonitorRun).toHaveBeenCalledWith(
      expect.objectContaining({
        monitorKey: "customer-agent-reconcile",
        status: "degraded",
        succeeded: true,
      }),
    );
  });

  it("rejects unauthorized callers", async () => {
    isOpsAuthorized.mockReturnValue(false);

    const response = await GET(new Request("https://app.example.com/api/cron/customer-agent-reconcile"));

    expect(response.status).toBe(403);
    expect(performOpsHealthAudit).not.toHaveBeenCalled();
    expect(recordMonitorRun).not.toHaveBeenCalled();
  });
});
