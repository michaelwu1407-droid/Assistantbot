import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  getExpectedVoiceGatewayUrl: vi.fn(),
  getKnownEarlymarkInboundNumbers: vi.fn(),
  getCustomerAgentReadiness: vi.fn(),
  getLivekitSipTerminationUri: vi.fn(),
  getRecommendedTwilioOriginationUri: vi.fn(),
  getLivekitSipHealth: vi.fn(),
  getVoiceAgentRuntimeDrift: vi.fn(),
  auditTwilioMessagingRouting: vi.fn(),
  auditTwilioVoiceRouting: vi.fn(),
}));

vi.mock("@/lib/earlymark-inbound-config", () => ({
  getExpectedVoiceGatewayUrl: hoisted.getExpectedVoiceGatewayUrl,
  getKnownEarlymarkInboundNumbers: hoisted.getKnownEarlymarkInboundNumbers,
}));

vi.mock("@/lib/customer-agent-readiness", () => ({
  getCustomerAgentReadiness: hoisted.getCustomerAgentReadiness,
}));

vi.mock("@/lib/livekit-sip-config", () => ({
  getLivekitSipTerminationUri: hoisted.getLivekitSipTerminationUri,
  getRecommendedTwilioOriginationUri: hoisted.getRecommendedTwilioOriginationUri,
}));

vi.mock("@/lib/livekit-sip-health", () => ({
  getLivekitSipHealth: hoisted.getLivekitSipHealth,
}));

vi.mock("@/lib/voice-agent-runtime", () => ({
  getVoiceAgentRuntimeDrift: hoisted.getVoiceAgentRuntimeDrift,
}));

vi.mock("@/lib/twilio-drift", () => ({
  auditTwilioMessagingRouting: hoisted.auditTwilioMessagingRouting,
  auditTwilioVoiceRouting: hoisted.auditTwilioVoiceRouting,
}));

import { GET } from "@/app/api/check-env/route";

describe("GET /api/check-env", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.TWILIO_ACCOUNT_SID = "AC123";
    process.env.TWILIO_AUTH_TOKEN = "auth";
    process.env.TWILIO_PHONE_NUMBER = "+61400000000";
    process.env.EARLYMARK_INBOUND_PHONE_NUMBER = "+61485010634";
    process.env.EARLYMARK_INBOUND_PHONE_NUMBERS = "+61485010634,+61485010635";
    process.env.LIVEKIT_URL = "https://live.earlymark.ai";
    process.env.LIVEKIT_API_KEY = "lk_key";
    process.env.LIVEKIT_API_SECRET = "lk_secret";
    process.env.LIVEKIT_SIP_TRUNK_ID = "ST_demo";
    process.env.LIVEKIT_SIP_URI = "sip:demo@example.com";
    process.env.NEXT_PUBLIC_APP_URL = "https://earlymark.ai";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.com";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    process.env.GEMINI_API_KEY = "gemini";

    hoisted.getExpectedVoiceGatewayUrl.mockReturnValue("https://earlymark.ai/api/webhooks/twilio-voice-gateway");
    hoisted.getKnownEarlymarkInboundNumbers.mockReturnValue(["+61485010634"]);
    hoisted.getLivekitSipTerminationUri.mockReturnValue("sip:termination@example.com");
    hoisted.getRecommendedTwilioOriginationUri.mockReturnValue("sip:origination@example.com");
    hoisted.getLivekitSipHealth.mockResolvedValue({
      status: "healthy",
      summary: "LiveKit SIP is healthy.",
      demoOutbound: { status: "healthy" },
    });
    hoisted.getVoiceAgentRuntimeDrift.mockResolvedValue({
      status: "healthy",
      summary: "Workers aligned",
    });
    hoisted.auditTwilioVoiceRouting.mockResolvedValue({
      status: "healthy",
      expectedVoiceGatewayUrl: "https://earlymark.ai/api/webhooks/twilio-voice-gateway",
    });
    hoisted.auditTwilioMessagingRouting.mockResolvedValue({
      status: "healthy",
      expectedSmsWebhookUrl: "https://earlymark.ai/api/twilio/webhook",
    });
    hoisted.getCustomerAgentReadiness.mockResolvedValue({
      overallStatus: "healthy",
      summary: "ready",
    });
  });

  it("reports readiness with masked env details and dependency audits", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.provisioningReady).toBe(true);
    expect(body.missing).toEqual([]);
    expect(body.env.twilio.accountSid).toBe(true);
    expect(body.env.livekit.demoOutbound).toEqual({ status: "healthy" });
    expect(body.env.app.expectedSmsWebhookUrl).toBe("https://earlymark.ai/api/twilio/webhook");
    expect(body.env.masked.twilioAccountSid).toBe("AC123...");
    expect(body.customerFacingAgents).toEqual({
      overallStatus: "healthy",
      summary: "ready",
    });
    expect(hoisted.auditTwilioVoiceRouting).toHaveBeenCalledWith({ apply: false });
    expect(hoisted.auditTwilioMessagingRouting).toHaveBeenCalledWith({ apply: false });
  });

  it("flags missing provisioning env requirements", async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.LIVEKIT_URL;
    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.provisioningReady).toBe(false);
    expect(body.missing).toEqual([
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "LIVEKIT_URL",
      "LIVEKIT_API_KEY",
      "LIVEKIT_API_SECRET",
    ]);
  });
});
