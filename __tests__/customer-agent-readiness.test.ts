import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  auditTwilioVoiceRouting,
  auditTwilioMessagingRouting,
  getVoiceAgentRuntimeDrift,
  getVoiceFleetHealth,
  getVoiceLatencyHealth,
} = vi.hoisted(() => ({
  auditTwilioVoiceRouting: vi.fn(),
  auditTwilioMessagingRouting: vi.fn(),
  getVoiceAgentRuntimeDrift: vi.fn(),
  getVoiceFleetHealth: vi.fn(),
  getVoiceLatencyHealth: vi.fn(),
}));

vi.mock("@/lib/twilio-drift", () => ({
  auditTwilioVoiceRouting,
  auditTwilioMessagingRouting,
}));

vi.mock("@/lib/voice-agent-runtime", () => ({
  getVoiceAgentRuntimeDrift,
  getExpectedVoiceAgentRuntimeFingerprint: () => "va_test",
}));

vi.mock("@/lib/voice-fleet", () => ({
  getVoiceFleetHealth,
}));

vi.mock("@/lib/voice-call-latency-health", () => ({
  getVoiceLatencyHealth,
}));

import { getCustomerAgentReadiness } from "@/lib/customer-agent-readiness";

const originalEnv = { ...process.env };

function createVoiceFleetHealth() {
  return {
    status: "healthy" as const,
    summary: "fleet ready",
    warnings: [],
    checkedAt: "2026-03-12T00:00:00.000Z",
    latestHeartbeatAt: "2026-03-12T00:00:00.000Z",
    hosts: [],
    surfaces: {
      demo: {
        surface: "demo" as const,
        status: "healthy" as const,
        summary: "demo ready",
        warnings: [],
        supportingHosts: [],
        atCapacityHosts: [],
        expectedHostCount: 2,
        capacityExhausted: false,
        workers: [],
      },
      inbound_demo: {
        surface: "inbound_demo" as const,
        status: "healthy" as const,
        summary: "inbound ready",
        warnings: [],
        supportingHosts: [],
        atCapacityHosts: [],
        expectedHostCount: 2,
        capacityExhausted: false,
        workers: [],
      },
      normal: {
        surface: "normal" as const,
        status: "healthy" as const,
        summary: "normal ready",
        warnings: [],
        supportingHosts: [],
        atCapacityHosts: [],
        expectedHostCount: 2,
        capacityExhausted: false,
        workers: [],
      },
    },
  };
}

describe("getCustomerAgentReadiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      GEMINI_API_KEY: "gemini-key",
      TWILIO_ACCOUNT_SID: "AC123",
      TWILIO_AUTH_TOKEN: "auth-token",
      TWILIO_WHATSAPP_NUMBER: "+15550001111",
      NEXT_PUBLIC_SUPABASE_URL: "https://supabase.example.com",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      LIVEKIT_URL: "wss://livekit.example.com",
      LIVEKIT_API_KEY: "livekit-key",
      LIVEKIT_API_SECRET: "livekit-secret",
      NEXT_PUBLIC_APP_URL: "https://app.example.com",
      LIVEKIT_SIP_TRUNK_ID: "sip-trunk",
      CARTESIA_API_KEY: "cartesia-key",
      INBOUND_LEAD_DOMAIN: "leads.example.com",
      EARLYMARK_INBOUND_PHONE_NUMBER: "+15551234567",
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("reuses provided audit results instead of rerunning heavy checks", async () => {
    const readiness = await getCustomerAgentReadiness({
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
        status: "healthy",
        summary: "messaging ready",
        expectedSmsWebhookUrl: "https://app.example.com/api/twilio/webhook",
        numbers: [],
        warnings: [],
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
      voiceFleet: createVoiceFleetHealth(),
      voiceLatency: {
        status: "healthy",
        summary: "latency ready",
        warnings: [],
        lookbackMinutes: 60,
        scopes: [],
      },
    });

    expect(readiness.overallStatus).toBe("healthy");
    expect(readiness.checks.inboundVoice.status).toBe("healthy");
    expect(readiness.checks.smsInbound.status).toBe("healthy");
    expect(auditTwilioVoiceRouting).not.toHaveBeenCalled();
    expect(auditTwilioMessagingRouting).not.toHaveBeenCalled();
    expect(getVoiceAgentRuntimeDrift).not.toHaveBeenCalled();
    expect(getVoiceFleetHealth).not.toHaveBeenCalled();
    expect(getVoiceLatencyHealth).not.toHaveBeenCalled();
  });
});
