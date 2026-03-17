import { describe, expect, it, vi, beforeEach } from "vitest";

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
}));

import { getLaunchReadiness } from "@/lib/launch-readiness";

describe("getLaunchReadiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getVoiceMonitorStaleAfterMs.mockReturnValue(420_000);
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
  });
});
