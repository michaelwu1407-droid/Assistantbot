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

const baseLaunchReadiness = {
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
    recentSmsFailureLookbackHours: 24,
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
    sms: {
      status: "healthy",
      summary: "sms passive healthy",
      warnings: [],
      activeWorkspaceCount: 1,
      failureWorkspaceCount: 0,
      unknownWorkspaceCount: 0,
      recentInboundSmsSuccessCount: 0,
      recentInboundSmsFailureCount: 0,
      recentReplySmsSuccessCount: 0,
      recentReplySmsFailureCount: 0,
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
      dnsReady: true,
      resendReceivingEnabled: true,
      resendReceivingRecordStatus: "verified",
      providerVerified: true,
      receivingConfirmed: true,
      stage: "receiving_confirmed",
      receivingConfirmationLookbackDays: 14,
      recentInboundEmailSuccessCount: 1,
      recentInboundEmailFailureCount: 0,
      lastInboundEmailSuccessAt: "2026-03-17T01:45:00.000Z",
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
    proof: {
      status: "healthy",
      summary: "Recent inbound_demo latency proof has 2 phone sample(s), including 1 spoken-canary sample(s).",
      surfaces: [
        {
          surface: "inbound_demo",
          status: "healthy",
          summary: "Recent inbound_demo latency proof has 2 phone sample(s), including 1 spoken-canary sample(s).",
          sampleCount: 2,
          syntheticProbeSampleCount: 1,
          latestCallAt: "2026-03-17T01:58:00.000Z",
          latestSyntheticProbeCallAt: "2026-03-17T01:55:00.000Z",
        },
      ],
    },
  },
};

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
    getLaunchReadiness.mockResolvedValue(structuredClone(baseLaunchReadiness));
  });

  it("returns launch-readiness-backed public health output", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.coreStatus).toBe("healthy");
    expect(body.voiceStatus).toBe("healthy");
    expect(body.overallStatus).toBe("healthy");
    expect(body.services.launchReadiness).toBe("healthy");
    expect(body.services.launchCore).toBe("healthy");
    expect(body.services.passiveProduction).toBe("healthy");
    expect(body.services.voiceLatency).toBe("healthy");
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
    expect(body.voiceLatencyProof).toMatchObject({
      status: "healthy",
      surfaces: [
        expect.objectContaining({
          surface: "inbound_demo",
          sampleCount: 2,
          syntheticProbeSampleCount: 1,
        }),
      ],
    });
  });

  it("keeps public health green when core voice is healthy but passive production is degraded", async () => {
    getLaunchReadiness.mockResolvedValueOnce({
      ...structuredClone(baseLaunchReadiness),
      status: "unhealthy",
      summary: "1 active customer workspace(s) have real recent SMS failure signals.",
      passiveProduction: {
        ...structuredClone(baseLaunchReadiness.passiveProduction),
        status: "unhealthy",
        summary: "1 active customer workspace(s) have real recent SMS failure signals.",
        warnings: ["1 active customer workspace(s) have real recent SMS failure signals."],
      },
      monitoring: {
        ...structuredClone(baseLaunchReadiness.monitoring),
        status: "degraded",
        summary: "Passive communications monitor is catching up.",
        warnings: ["Passive communications monitor is catching up."],
        healthAudit: { status: "healthy", warnings: [] },
        watchdog: { status: "healthy", warnings: [] },
        passiveTraffic: { status: "degraded", warnings: ["Passive communications monitor is catching up."] },
      },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.coreStatus).toBe("healthy");
    expect(body.voiceStatus).toBe("healthy");
    expect(body.overallStatus).toBe("unhealthy");
    expect(body.services.launchReadiness).toBe("unhealthy");
    expect(body.services.launchCore).toBe("healthy");
    expect(body.services.passiveProduction).toBe("unhealthy");
    expect(body.summary).toContain("Core voice and launch-critical services are healthy.");
    expect(body.summary).toContain("real recent SMS failure signals");
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
