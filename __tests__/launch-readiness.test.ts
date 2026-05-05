import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCustomerAgentReadiness: vi.fn(),
  getInboundLeadEmailReadiness: vi.fn(),
  getLivekitSipHealth: vi.fn(),
  getMonitorRunHealth: vi.fn(),
  getPassiveProductionHealth: vi.fn(),
  getProvisioningReadinessSummary: vi.fn(),
  getCurrentAppReleaseInfo: vi.fn(),
  buildWorkerReleaseTruth: vi.fn(),
  auditTwilioMessagingRouting: vi.fn(),
  auditTwilioVoiceRouting: vi.fn(),
  getVoiceAgentRuntimeDrift: vi.fn(),
  getVoiceFleetHealth: vi.fn(),
  getVoiceLatencyHealth: vi.fn(),
  getVoiceMonitorStaleAfterMs: vi.fn(),
  getVoiceSyntheticProbeStaleAfterMs: vi.fn(),
}));

vi.mock("@/lib/customer-agent-readiness", () => ({
  getCustomerAgentReadiness: mocks.getCustomerAgentReadiness,
}));

vi.mock("@/lib/inbound-lead-email-readiness", () => ({
  getInboundLeadEmailReadiness: mocks.getInboundLeadEmailReadiness,
}));

vi.mock("@/lib/livekit-sip-health", () => ({
  getLivekitSipHealth: mocks.getLivekitSipHealth,
}));

vi.mock("@/lib/ops-monitor-runs", () => ({
  getMonitorRunHealth: mocks.getMonitorRunHealth,
}));

vi.mock("@/lib/passive-production-health", () => ({
  getPassiveProductionHealth: mocks.getPassiveProductionHealth,
}));

vi.mock("@/lib/provisioning-readiness", () => ({
  getProvisioningReadinessSummary: mocks.getProvisioningReadinessSummary,
}));

vi.mock("@/lib/release-truth", () => ({
  getCurrentAppReleaseInfo: mocks.getCurrentAppReleaseInfo,
  buildWorkerReleaseTruth: mocks.buildWorkerReleaseTruth,
}));

vi.mock("@/lib/twilio-drift", () => ({
  auditTwilioMessagingRouting: mocks.auditTwilioMessagingRouting,
  auditTwilioVoiceRouting: mocks.auditTwilioVoiceRouting,
}));

vi.mock("@/lib/voice-agent-runtime", () => ({
  getVoiceAgentRuntimeDrift: mocks.getVoiceAgentRuntimeDrift,
}));

vi.mock("@/lib/voice-fleet", () => ({
  getVoiceFleetHealth: mocks.getVoiceFleetHealth,
}));

vi.mock("@/lib/voice-call-latency-health", () => ({
  getVoiceLatencyHealth: mocks.getVoiceLatencyHealth,
}));

vi.mock("@/lib/voice-monitor-config", () => ({
  getVoiceMonitorStaleAfterMs: mocks.getVoiceMonitorStaleAfterMs,
  getVoiceSyntheticProbeStaleAfterMs: mocks.getVoiceSyntheticProbeStaleAfterMs,
}));

import { getLaunchReadiness } from "@/lib/launch-readiness";

describe("getLaunchReadiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getVoiceMonitorStaleAfterMs.mockReturnValue(420_000);
    mocks.getVoiceSyntheticProbeStaleAfterMs.mockReturnValue(2_700_000);
    mocks.getCurrentAppReleaseInfo.mockReturnValue({
      gitSha: "web-sha",
      buildId: "build-id",
      source: "test",
    });
    mocks.buildWorkerReleaseTruth.mockReturnValue({
      status: "healthy",
      summary: "worker release healthy",
      warnings: [],
      expectedWorkerSha: null,
      actualWorkerShaSet: ["worker-sha"],
      hostId: null,
      hosts: [],
    });
    mocks.auditTwilioVoiceRouting.mockResolvedValue({
      status: "healthy",
      summary: "voice healthy",
      warnings: [],
    });
    mocks.auditTwilioMessagingRouting.mockResolvedValue({
      status: "healthy",
      summary: "sms healthy",
      warnings: [],
      managedNumberCount: 0,
      expectedSmsWebhookUrl: "https://example.com/api/twilio/webhook",
    });
    mocks.getVoiceAgentRuntimeDrift.mockResolvedValue({
      status: "healthy",
      summary: "worker runtime healthy",
      warnings: [],
    });
    mocks.getVoiceFleetHealth.mockResolvedValue({
      status: "healthy",
      summary: "fleet healthy",
      warnings: [],
    });
    mocks.getLivekitSipHealth.mockResolvedValue({
      status: "healthy",
      summary: "sip healthy",
      warnings: [],
    });
    mocks.getVoiceLatencyHealth.mockResolvedValue({
      status: "healthy",
      summary: "latency healthy",
      warnings: [],
      proof: {
        status: "healthy",
        summary: "latency proof healthy",
        surfaces: [],
      },
    });
    mocks.getMonitorRunHealth.mockResolvedValue({
      status: "healthy",
      summary: "monitor healthy",
      warnings: [],
      details: null,
    });
    mocks.getInboundLeadEmailReadiness.mockResolvedValue({
      ready: true,
      issues: [],
      warnings: [],
      domain: "inbound.earlymark.ai",
    });
    mocks.getProvisioningReadinessSummary.mockResolvedValue({
      status: "healthy",
      summary: "provisioning healthy",
      warnings: [],
      issues: [],
    });
    mocks.getPassiveProductionHealth.mockResolvedValue({
      status: "healthy",
      summary: "passive healthy",
      warnings: [],
      unhealthyActiveWorkspaceCount: 0,
      voice: { status: "healthy", summary: "voice passive healthy", workspaces: [] },
      sms: { status: "healthy", summary: "sms passive healthy", workspaces: [] },
      email: { status: "healthy", summary: "email passive healthy", workspaces: [] },
      workspaces: [],
    });
    mocks.getCustomerAgentReadiness.mockResolvedValue({
      overallStatus: "healthy",
      checks: {
        inboundVoice: { status: "healthy", summary: "ready" },
      },
    });
  });

  it("allows production launch readiness to stay healthy with zero managed Earlymark SMS numbers", async () => {
    const result = await getLaunchReadiness();

    expect(result.communications.sms.status).toBe("healthy");
    expect(result.communications.sms.summary).toContain("allowed");
    expect(result.communications.status).toBe("healthy");
    expect(result.communications.warnings).toEqual([]);
    expect(result.status).toBe("healthy");
    expect(mocks.getMonitorRunHealth).toHaveBeenNthCalledWith(1, "voice-agent-health", 420_000);
    expect(mocks.getMonitorRunHealth).toHaveBeenNthCalledWith(2, "voice-monitor-watchdog", 420_000);
    expect(mocks.getMonitorRunHealth).toHaveBeenNthCalledWith(3, "passive-communications-health", 420_000);
    expect(mocks.getMonitorRunHealth).toHaveBeenNthCalledWith(4, "voice-synthetic-probe", 2_700_000);
  });

  it("surfaces non-blocking Resend admin warnings without degrading communications", async () => {
    mocks.getInboundLeadEmailReadiness.mockResolvedValueOnce({
      ready: true,
      issues: [],
      warnings: [
        "Resend admin verification is rate-limited: Resend domain detail returned HTTP 429. Using the verified domain summary for inbound.earlymark.ai for now.",
      ],
      domain: "inbound.earlymark.ai",
    });

    const result = await getLaunchReadiness();

    expect(result.communications.status).toBe("healthy");
    expect(result.communications.email.status).toBe("healthy");
    expect(result.communications.email.warnings).toEqual([
      "Resend admin verification is rate-limited: Resend domain detail returned HTTP 429. Using the verified domain summary for inbound.earlymark.ai for now.",
    ]);
  });

  it("lets the spoken canary drive unhealthy launch readiness when the latest probe failed", async () => {
    mocks.getMonitorRunHealth
      .mockResolvedValueOnce({
        status: "healthy",
        summary: "voice monitor healthy",
        warnings: [],
        details: null,
      })
      .mockResolvedValueOnce({
        status: "healthy",
        summary: "watchdog healthy",
        warnings: [],
        details: null,
      })
      .mockResolvedValueOnce({
        status: "healthy",
        summary: "passive monitor healthy",
        warnings: [],
        details: null,
      })
      .mockResolvedValueOnce({
        status: "unhealthy",
        summary: "Spoken canary failed to capture assistant speech.",
        warnings: ["canary failed"],
        details: {
          probeResult: "pass",
          targetNumber: "+61485010634",
          spokenCanary: {
            mode: "pstn_spoken",
            callSid: "CA123",
            callStatus: "completed",
          },
        },
      });

    const result = await getLaunchReadiness();

    expect(result.canary.status).toBe("unhealthy");
    expect(result.status).toBe("unhealthy");
    expect(result.summary).toBe("Spoken canary failed to capture assistant speech.");
    expect(result.canary.callSid).toBe("CA123");
    expect(result.canary.targetNumber).toBe("+61485010634");
  });

  it("lets degraded latency proof drive degraded launch readiness even when the core voice checks are healthy", async () => {
    mocks.getVoiceLatencyHealth.mockResolvedValueOnce({
      status: "degraded",
      summary: "No recent inbound_demo calls have been persisted, so latency cannot be verified.",
      warnings: ["No recent inbound_demo calls have been persisted, so latency cannot be verified."],
      proof: {
        status: "degraded",
        summary: "No recent inbound_demo calls have been persisted, so latency cannot be verified.",
        surfaces: [
          {
            surface: "inbound_demo",
            status: "degraded",
            summary: "No recent inbound_demo calls have been persisted, so latency cannot be verified.",
            sampleCount: 0,
            syntheticProbeSampleCount: 0,
            latestCallAt: null,
            latestSyntheticProbeCallAt: null,
          },
        ],
      },
    });

    const result = await getLaunchReadiness();

    expect(result.latency.status).toBe("degraded");
    expect(result.status).toBe("degraded");
    expect(result.summary).toBe("No recent inbound_demo calls have been persisted, so latency cannot be verified.");
  });
});
