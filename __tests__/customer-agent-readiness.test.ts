import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  auditTwilioVoiceRouting,
  auditTwilioMessagingRouting,
  getVoiceAgentRuntimeDrift,
  getVoiceFleetHealth,
  getVoiceLatencyHealth,
  getInboundLeadEmailReadiness,
} = vi.hoisted(() => ({
  auditTwilioVoiceRouting: vi.fn(),
  auditTwilioMessagingRouting: vi.fn(),
  getVoiceAgentRuntimeDrift: vi.fn(),
  getVoiceFleetHealth: vi.fn(),
  getVoiceLatencyHealth: vi.fn(),
  getInboundLeadEmailReadiness: vi.fn(),
}));

const { db } = vi.hoisted(() => ({
  db: {
    webhookEvent: {
      findMany: vi.fn(),
    },
  },
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

vi.mock("@/lib/inbound-lead-email-readiness", () => ({
  getInboundLeadEmailReadiness,
}));

vi.mock("@/lib/db", () => ({
  db,
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
    getInboundLeadEmailReadiness.mockResolvedValue({
      ready: true,
      domain: "leads.example.com",
      issues: [],
      dnsMxHosts: ["inbound-smtp.ap-southeast-2.amazonaws.com"],
      dnsReady: true,
      resendReceivingEnabled: true,
      resendReceivingRecordStatus: "verified",
      providerVerified: true,
      receivingConfirmed: false,
      stage: "provider_verified",
      receivingConfirmationLookbackDays: 14,
      recentInboundEmailSuccessCount: 0,
      recentInboundEmailFailureCount: 0,
      lastInboundEmailSuccessAt: null,
      lastInboundEmailFailureAt: null,
    });
    db.webhookEvent.findMany.mockResolvedValue([]);
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
      livekitSip: {
        status: "healthy",
        summary: "livekit sip ready",
        warnings: [],
        checkedAt: "2026-03-12T00:00:00.000Z",
        livekitUrl: "https://livekit.example.com",
        inboundTrunkCount: 1,
        outboundTrunkCount: 1,
        dispatchRuleCount: 1,
        expectedInboundNumbers: ["+15551234567"],
        missingInboundNumbers: [],
        inboundTrunks: [],
        outboundTrunks: [],
        demoOutbound: {
          status: "healthy",
          summary: "outbound ready",
          warnings: [],
          configuredTrunkId: "sip-trunk",
          resolvedTrunkId: "sip-trunk",
          configuredTrunkMatched: true,
          callerNumber: "+15551234567",
        },
        dispatchRules: [],
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

  it("degrades whatsapp readiness when recent assistant sends are failing", async () => {
    db.webhookEvent.findMany.mockResolvedValue([
      {
        eventType: "whatsapp.outbound",
        status: "error",
        payload: {
          error: "Twilio could not find a Channel with the specified From address",
        },
        createdAt: new Date("2026-04-08T09:09:04.521Z"),
      },
    ]);

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
      livekitSip: {
        status: "healthy",
        summary: "livekit sip ready",
        warnings: [],
        checkedAt: "2026-03-12T00:00:00.000Z",
        livekitUrl: "https://livekit.example.com",
        inboundTrunkCount: 1,
        outboundTrunkCount: 1,
        dispatchRuleCount: 1,
        expectedInboundNumbers: ["+15551234567"],
        missingInboundNumbers: [],
        inboundTrunks: [],
        outboundTrunks: [],
        demoOutbound: {
          status: "healthy",
          summary: "outbound ready",
          warnings: [],
          configuredTrunkId: "sip-trunk",
          resolvedTrunkId: "sip-trunk",
          configuredTrunkMatched: true,
          callerNumber: "+15551234567",
        },
        dispatchRules: [],
      },
    });

    expect(readiness.checks.whatsappAssistant.status).toBe("degraded");
    expect(readiness.checks.whatsappAssistant.warnings).toContain(
      "Twilio could not find a Channel with the specified From address",
    );
  });

  it("treats inbound lead email DNS drift as degraded instead of unhealthy", async () => {
    getInboundLeadEmailReadiness.mockResolvedValue({
      ready: false,
      domain: "inbound.earlymark.ai",
      issues: [
        "Inbound domain inbound.earlymark.ai has no valid MX record (queryMx ENOTFOUND inbound.earlymark.ai).",
        "Resend inbound receiving record for inbound.earlymark.ai is not verified.",
      ],
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
    });

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
      livekitSip: {
        status: "healthy",
        summary: "livekit sip ready",
        warnings: [],
        checkedAt: "2026-03-12T00:00:00.000Z",
        livekitUrl: "https://livekit.example.com",
        inboundTrunkCount: 1,
        outboundTrunkCount: 1,
        dispatchRuleCount: 1,
        expectedInboundNumbers: ["+15551234567"],
        missingInboundNumbers: [],
        inboundTrunks: [],
        outboundTrunks: [],
        demoOutbound: {
          status: "healthy",
          summary: "outbound ready",
          warnings: [],
          configuredTrunkId: "sip-trunk",
          resolvedTrunkId: "sip-trunk",
          configuredTrunkMatched: true,
          callerNumber: "+15551234567",
        },
        dispatchRules: [],
      },
    });

    expect(readiness.overallStatus).toBe("degraded");
    expect(readiness.checks.emailLeadCapture.status).toBe("degraded");
    expect(readiness.checks.emailLeadCapture.warnings).toContain(
      "Inbound domain inbound.earlymark.ai has no valid MX record (queryMx ENOTFOUND inbound.earlymark.ai).",
    );
  });
});
