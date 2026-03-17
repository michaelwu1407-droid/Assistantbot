import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getLaunchReadiness,
  isOpsAuthorized,
  isVoiceAgentSecretAuthorized,
} = vi.hoisted(() => ({
  getLaunchReadiness: vi.fn(),
  isOpsAuthorized: vi.fn(),
  isVoiceAgentSecretAuthorized: vi.fn(),
}));

vi.mock("@/lib/launch-readiness", () => ({
  getLaunchReadiness,
}));

vi.mock("@/lib/ops-auth", () => ({
  isOpsAuthorized,
  getUnauthorizedJsonResponse: () =>
    new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }),
}));

vi.mock("@/lib/voice-agent-auth", () => ({
  isVoiceAgentSecretAuthorized,
}));

import { GET } from "@/app/api/internal/launch-readiness/route";

describe("GET /api/internal/launch-readiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isOpsAuthorized.mockReturnValue(true);
    isVoiceAgentSecretAuthorized.mockReturnValue(false);
    getLaunchReadiness.mockResolvedValue({
      status: "degraded",
      summary: "No recent persisted Earlymark inbound voice calls were observed.",
      checkedAt: "2026-03-17T05:00:00.000Z",
      release: {
        app: {
          runtime: "web",
          gitSha: "abcdef123456",
          shortGitSha: "abcdef12",
          deploymentId: "dep_123",
          provider: "vercel",
          nodeEnv: "production",
        },
        worker: {
          status: "healthy",
          summary: "All scoped workers report a consistent healthy live release.",
          warnings: [],
          expectedWorkerSha: "abcdef123456",
          scopedHostId: "voice-host-a",
          liveDeployGitShas: ["abcdef123456"],
          alignedHostIds: ["voice-host-a"],
          mismatchedHostIds: [],
          hosts: [],
        },
      },
      voiceCritical: {
        status: "healthy",
        summary: "Voice routing, SIP, and worker release state are healthy.",
        warnings: [],
        twilioVoiceRouting: { status: "healthy", warnings: [] },
        livekitSip: { status: "healthy", warnings: [] },
        voiceWorker: { status: "healthy", warnings: [] },
        voiceFleet: { status: "healthy", warnings: [] },
      },
      passiveProduction: {
        status: "degraded",
        summary: "No recent persisted Earlymark inbound voice calls were observed.",
        warnings: ["No recent persisted Earlymark inbound voice calls were observed."],
        checkedAt: "2026-03-17T05:00:00.000Z",
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
          activeWorkspaceCount: 0,
          failureWorkspaceCount: 0,
          unknownWorkspaceCount: 0,
        },
        sms: {
          status: "healthy",
          summary: "No recent real inbound SMS failure signals were observed.",
          warnings: [],
          activeWorkspaceCount: 0,
          failureWorkspaceCount: 0,
          unknownWorkspaceCount: 0,
          recentInboundSmsSuccessCount: 0,
          recentInboundSmsFailureCount: 0,
          recentReplySmsSuccessCount: 0,
          recentReplySmsFailureCount: 0,
        },
        email: {
          status: "healthy",
          summary: "No recent real inbound email failure signals were observed.",
          warnings: [],
          activeWorkspaceCount: 0,
          failureWorkspaceCount: 0,
          unknownWorkspaceCount: 0,
          recentInboundEmailSuccessCount: 0,
          recentInboundEmailFailureCount: 0,
        },
        activeWorkspaceCount: 0,
        unhealthyActiveWorkspaceCount: 0,
        unknownWorkspaceCount: 0,
        workspaceRows: [],
      },
      canary: {
        status: "degraded",
        summary: "Gateway probe passed, but there is no recent spoken canary sample for the probe path.",
        warnings: [],
        monitor: { status: "degraded", warnings: [], lastSuccessAt: "2026-03-17T04:55:00.000Z" },
        probeResult: "pass",
        probeMode: "gateway_only",
        targetNumber: "+61485010634",
        callSid: null,
        callStatus: null,
        spokenCanary: null,
      },
      monitoring: {
        status: "healthy",
        summary: "Control-plane and passive traffic monitors are reporting on schedule.",
        warnings: [],
        healthAudit: { status: "healthy", warnings: [] },
        watchdog: { status: "healthy", warnings: [] },
        passiveTraffic: { status: "healthy", warnings: [] },
      },
      communications: {
        status: "degraded",
        summary: "Inbound domain inbound.earlymark.ai has no valid MX record.",
        warnings: ["Inbound domain inbound.earlymark.ai has no valid MX record."],
        sms: {
          status: "healthy",
          summary: "Twilio SMS routing is healthy.",
          warnings: [],
          managedNumberCount: 1,
          expectedSmsWebhookUrl: "https://app.example.com/api/twilio/webhook",
        },
        email: {
          status: "degraded",
          summary: "Inbound domain inbound.earlymark.ai has no valid MX record.",
          warnings: ["Inbound domain inbound.earlymark.ai has no valid MX record."],
          ready: false,
          domain: "inbound.earlymark.ai",
          issues: ["Inbound domain inbound.earlymark.ai has no valid MX record."],
          dnsMxHosts: [],
          dnsReady: false,
          resendReceivingEnabled: false,
          resendReceivingRecordStatus: "missing",
          providerVerified: false,
          receivingConfirmed: false,
          stage: "reserved",
          receivingConfirmationLookbackDays: 14,
          recentInboundEmailSuccessCount: 0,
          recentInboundEmailFailureCount: 0,
          lastInboundEmailSuccessAt: null,
          lastInboundEmailFailureAt: null,
        },
      },
      provisioning: {
        status: "healthy",
        summary: "Workspace Twilio provisioning is stable across tracked workspaces.",
        warnings: [],
        counts: {
          not_requested: 0,
          requested: 0,
          provisioning: 0,
          provisioned: 1,
          failed: 0,
          blocked_duplicate: 0,
          already_provisioned: 0,
          untracked: 0,
        },
        pendingCount: 0,
        failedCount: 0,
        issueCount: 0,
        recentIssues: [],
      },
      readiness: {
        overallStatus: "degraded",
        checks: {},
      },
      latency: {
        status: "healthy",
        summary: "Recent persisted voice-call latency is within expected thresholds",
        warnings: [],
        lookbackMinutes: 60,
        scopes: [],
      },
    });
  });

  it("returns launch readiness and forwards expected worker sha and host filters", async () => {
    const response = await GET(
      new NextRequest("https://app.example.com/api/internal/launch-readiness?expectedWorkerSha=abcdef123456&hostId=voice-host-a"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getLaunchReadiness).toHaveBeenCalledWith({
      expectedWorkerSha: "abcdef123456",
      hostId: "voice-host-a",
    });
    expect(body.release.app.shortGitSha).toBe("abcdef12");
    expect(body.voiceCritical.status).toBe("healthy");
    expect(body.passiveProduction.status).toBe("degraded");
    expect(body.canary.status).toBe("degraded");
  });

  it("rejects unauthorized callers", async () => {
    isOpsAuthorized.mockReturnValue(false);
    isVoiceAgentSecretAuthorized.mockReturnValue(false);

    const response = await GET(new NextRequest("https://app.example.com/api/internal/launch-readiness"));

    expect(response.status).toBe(403);
    expect(getLaunchReadiness).not.toHaveBeenCalled();
  });
});
