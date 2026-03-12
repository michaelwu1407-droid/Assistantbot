import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCustomerAgentReadiness,
  checkDatabaseHealth,
  getVoiceAgentRuntimeDrift,
  auditTwilioMessagingRouting,
  auditTwilioVoiceRouting,
  getVoiceFleetHealth,
  getVoiceLatencyHealth,
  combineVoiceStatuses,
} = vi.hoisted(() => ({
  getCustomerAgentReadiness: vi.fn(),
  checkDatabaseHealth: vi.fn(),
  getVoiceAgentRuntimeDrift: vi.fn(),
  auditTwilioMessagingRouting: vi.fn(),
  auditTwilioVoiceRouting: vi.fn(),
  getVoiceFleetHealth: vi.fn(),
  getVoiceLatencyHealth: vi.fn(),
  combineVoiceStatuses: vi.fn(),
}));

vi.mock("@/lib/customer-agent-readiness", () => ({
  getCustomerAgentReadiness,
}));

vi.mock("@/lib/health-check", () => ({
  checkDatabaseHealth,
}));

vi.mock("@/lib/voice-agent-runtime", () => ({
  getVoiceAgentRuntimeDrift,
}));

vi.mock("@/lib/twilio-drift", () => ({
  auditTwilioMessagingRouting,
  auditTwilioVoiceRouting,
}));

vi.mock("@/lib/voice-fleet", () => ({
  getVoiceFleetHealth,
}));

vi.mock("@/lib/voice-call-latency-health", () => ({
  getVoiceLatencyHealth,
}));

vi.mock("@/lib/voice-monitoring", () => ({
  combineVoiceStatuses,
}));

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkDatabaseHealth.mockResolvedValue({
      status: "healthy",
      latency: 12,
      timestamp: new Date("2026-03-12T00:00:00.000Z"),
    });
    getVoiceAgentRuntimeDrift.mockResolvedValue({
      status: "healthy",
      summary: "voice worker ready",
      warnings: [],
      expectedFingerprint: "va_live",
      latestHeartbeat: {
        checkedAt: "2026-03-12T00:00:00.000Z",
      },
    });
    getVoiceFleetHealth.mockResolvedValue({
      status: "healthy",
      summary: "fleet healthy",
    });
    getVoiceLatencyHealth.mockResolvedValue({
      status: "healthy",
      summary: "latency healthy",
    });
    auditTwilioVoiceRouting.mockResolvedValue({
      status: "healthy",
      summary: "voice routing healthy",
    });
    auditTwilioMessagingRouting.mockResolvedValue({
      status: "healthy",
      summary: "messaging routing healthy",
    });
    getCustomerAgentReadiness.mockResolvedValue({
      overallStatus: "healthy",
      checks: {
        inboundVoice: {
          status: "healthy",
        },
      },
    });
    combineVoiceStatuses.mockReturnValue("healthy");
  });

  it("includes the voice worker payload and combined service state", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.services.voiceWorker).toBe("healthy");
    expect(body.voiceWorker).toMatchObject({
      status: "healthy",
      summary: "voice worker ready",
      expectedFingerprint: "va_live",
    });
    expect(body.customerFacingAgents.overallStatus).toBe("healthy");
  });
});
