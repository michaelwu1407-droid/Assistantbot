import { beforeEach, describe, expect, it, vi } from "vitest";

const { checkDatabaseHealth, getLaunchReadiness, getCurrentAppReleaseInfo } = vi.hoisted(() => ({
  checkDatabaseHealth: vi.fn(),
  getLaunchReadiness: vi.fn(),
  getCurrentAppReleaseInfo: vi.fn(),
}));

vi.mock("@/lib/health-check", () => ({
  checkDatabaseHealth,
}));

vi.mock("@/lib/launch-readiness", () => ({
  getLaunchReadiness,
}));

vi.mock("@/lib/release-truth", () => ({
  getCurrentAppReleaseInfo,
}));

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkDatabaseHealth.mockResolvedValue({
      status: "healthy",
      latency: 12,
      timestamp: new Date("2026-03-17T02:00:00.000Z"),
    });
    getCurrentAppReleaseInfo.mockReturnValue({
      runtime: "web",
      gitSha: "abcdef123456",
      shortGitSha: "abcdef12",
      deploymentId: "dep_123",
      provider: "vercel",
      nodeEnv: "production",
    });
    getLaunchReadiness.mockResolvedValue({
      status: "healthy",
      summary: "Launch-critical web, voice, communications, and provisioning signals are healthy.",
      checkedAt: "2026-03-17T02:00:00.000Z",
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
          expectedWorkerSha: null,
          scopedHostId: null,
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
        twilioVoiceRouting: {
          status: "healthy",
          summary: "voice routing healthy",
          warnings: [],
        },
        livekitSip: {
          status: "healthy",
          summary: "sip healthy",
          warnings: [],
        },
        voiceWorker: {
          status: "healthy",
          summary: "voice worker ready",
          warnings: [],
          expectedFingerprint: "va_live",
          latestHeartbeat: {
            checkedAt: "2026-03-17T02:00:00.000Z",
          },
        },
        voiceFleet: {
          status: "healthy",
          summary: "fleet healthy",
          warnings: [],
        },
      },
      passiveProduction: {
        status: "healthy",
        summary: "Passive production health looks healthy across Earlymark and active customer workspaces.",
        warnings: [],
        checkedAt: "2026-03-17T02:00:00.000Z",
        signalLookbackDays: 7,
        activeWorkspaceLookbackDays: 14,
        recentTwilioFailureLookbackMinutes: 360,
        recentEmailFailureLookbackHours: 24,
        voice: {
          status: "healthy",
          summary: "voice passive healthy",
          warnings: [],
          earlymark: {
            status: "healthy",
            classification: "healthy",
            summary: "voice healthy",
            warnings: [],
            configured: true,
            lastSuccessAt: "2026-03-17T01:45:00.000Z",
            lastFailureAt: null,
            recentSuccessCount: 1,
            recentFailureCount: 0,
          },
          activeWorkspaceCount: 1,
          failureWorkspaceCount: 0,
          unknownWorkspaceCount: 0,
        },
        email: {
          status: "healthy",
          summary: "email passive healthy",
          warnings: [],
          activeWorkspaceCount: 1,
          failureWorkspaceCount: 0,
          unknownWorkspaceCount: 0,
          recentInboundEmailSuccessCount: 1,
          recentInboundEmailFailureCount: 0,
        },
        activeWorkspaceCount: 1,
        unhealthyActiveWorkspaceCount: 0,
        unknownWorkspaceCount: 0,
        workspaceRows: [],
      },
      canary: {
        status: "degraded",
        summary: "Active probe is reserved for deploy verification.",
        warnings: [],
        monitor: {
          status: "degraded",
          warnings: [],
          lastSuccessAt: "2026-03-17T01:55:00.000Z",
        },
        probeResult: "skipped",
        probeMode: "manual_only",
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
        status: "healthy",
        summary: "SMS and inbound email are ready.",
        warnings: [],
        sms: {
          status: "healthy",
          summary: "Twilio SMS routing is healthy.",
          warnings: [],
          managedNumberCount: 1,
          expectedSmsWebhookUrl: "https://app.example.com/api/twilio/webhook",
        },
        email: {
          status: "healthy",
          summary: "Inbound lead email is ready.",
          warnings: [],
          ready: true,
          domain: "inbound.earlymark.ai",
          issues: [],
          dnsMxHosts: ["inbound-smtp.ap-northeast-1.amazonaws.com"],
          resendReceivingEnabled: true,
          resendReceivingRecordStatus: "verified",
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
        overallStatus: "healthy",
        checks: {
          inboundVoice: {
            status: "healthy",
          },
        },
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

  it("returns launch-readiness-backed public health output", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.services.launchReadiness).toBe("healthy");
    expect(body.services.passiveProduction).toBe("healthy");
    expect(body.voiceWorker).toMatchObject({
      status: "healthy",
      summary: "voice worker ready",
      expectedFingerprint: "va_live",
    });
    expect(body.customerFacingAgents.overallStatus).toBe("healthy");
    expect(body.release.app.shortGitSha).toBe("abcdef12");
    expect(body.passiveProduction.status).toBe("healthy");
    expect(body.twilioMessagingRouting).toMatchObject({
      status: "healthy",
      managedNumberCount: 1,
    });
  });

  it("returns 503 when launch readiness cannot be produced", async () => {
    getLaunchReadiness.mockRejectedValue(new Error("launch readiness timeout"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.summary).toContain("Launch readiness check failed");
    expect(body.launchReadiness).toBeNull();
    expect(body.launchReadinessError).toBe("launch readiness timeout");
    expect(body.release.app.shortGitSha).toBe("abcdef12");
    expect(body.release.worker).toBeNull();
  });
});
