import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getExpectedVoiceGatewayUrl,
  getKnownEarlymarkInboundNumbers,
  getEarlymarkInboundSipUri,
  recordMonitorRun,
  isOpsAuthorized,
  dispatchVoiceIncidentNotifications,
  reconcileVoiceIncidents,
  runVoiceSpokenPstnCanary,
} = vi.hoisted(() => ({
  getExpectedVoiceGatewayUrl: vi.fn(),
  getKnownEarlymarkInboundNumbers: vi.fn(),
  getEarlymarkInboundSipUri: vi.fn(),
  recordMonitorRun: vi.fn(),
  isOpsAuthorized: vi.fn(),
  dispatchVoiceIncidentNotifications: vi.fn(),
  reconcileVoiceIncidents: vi.fn(),
  runVoiceSpokenPstnCanary: vi.fn(),
}));

vi.mock("@/lib/earlymark-inbound-config", () => ({
  getExpectedVoiceGatewayUrl,
  getKnownEarlymarkInboundNumbers,
}));

vi.mock("@/lib/livekit-sip-config", () => ({
  getEarlymarkInboundSipUri,
}));

vi.mock("@/lib/ops-monitor-runs", () => ({
  recordMonitorRun,
}));

vi.mock("@/lib/ops-auth", () => ({
  isOpsAuthorized,
  getUnauthorizedJsonResponse: () =>
    new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }),
}));

vi.mock("@/lib/voice-incident-alert", () => ({
  dispatchVoiceIncidentNotifications,
}));

vi.mock("@/lib/voice-incidents", () => ({
  reconcileVoiceIncidents,
}));

vi.mock("@/lib/voice-spoken-canary", () => ({
  runVoiceSpokenPstnCanary,
}));

import { GET } from "@/app/api/cron/voice-synthetic-probe/route";

describe("GET /api/cron/voice-synthetic-probe", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);

    process.env.CRON_SECRET = "probe-secret";
    isOpsAuthorized.mockReturnValue(true);
    getExpectedVoiceGatewayUrl.mockReturnValue("https://app.example.com/api/webhooks/twilio-voice-gateway");
    getKnownEarlymarkInboundNumbers.mockReturnValue(["61485010634"]);
    getEarlymarkInboundSipUri.mockReturnValue("sip:+61485010634@live.earlymark.ai:5060");
    reconcileVoiceIncidents.mockResolvedValue([]);
    recordMonitorRun.mockResolvedValue(undefined);
    dispatchVoiceIncidentNotifications.mockResolvedValue(null);
    runVoiceSpokenPstnCanary.mockResolvedValue({
      status: "healthy",
      summary: "Real PSTN spoken canary placed a successful inbound call and captured both caller and Tracey speech.",
      warnings: [],
      mode: "pstn_spoken",
      configured: true,
      supported: true,
      probeCaller: "+61434955958",
      targetNumber: "+61485010634",
      callSid: "CA123",
      callStatus: "completed",
      durationSeconds: 11,
      expectedPhrase: "Hello Tracey. This is the Earlymark voice monitor probe. Can you hear me?",
      verification: {
        callId: "voice_call_1",
        createdAt: "2026-03-17T06:00:00.000Z",
        heardProbePhrase: true,
        capturedCallerSpeech: true,
        capturedAssistantSpeech: true,
        heardGreeting: true,
        transcriptExcerpt: "Caller: Hello Tracey. This is the voice monitor probe.",
      },
    });
    fetchMock.mockResolvedValue(
      new Response("<Response><Dial><Sip>sip:+61485010634@live.earlymark.ai:5060</Sip></Dial></Response>", { status: 200 }),
    );
    delete process.env.VOICE_MONITOR_PROBE_TARGET_NUMBER;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.CRON_SECRET;
    delete process.env.VOICE_MONITOR_PROBE_TARGET_NUMBER;
  });

  it("prefers the operator override header for the probe target", async () => {
    process.env.VOICE_MONITOR_PROBE_TARGET_NUMBER = "+61400000000";

    const response = await GET(
      new NextRequest("https://app.example.com/api/cron/voice-synthetic-probe", {
        headers: {
          "x-voice-probe-target": "+61 412 345 678",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.targetNumber).toBe("+61412345678");
    expect(body.targetNumberSource).toBe("ops_header_target");
    expect(body.spokenCanary.status).toBe("healthy");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://app.example.com/api/webhooks/twilio-voice-gateway",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-voice-probe-key": "probe-secret",
        }),
        body: expect.stringContaining("To=%2B61412345678"),
      }),
    );
  });

  it("uses VOICE_MONITOR_PROBE_TARGET_NUMBER when no override header is provided", async () => {
    process.env.VOICE_MONITOR_PROBE_TARGET_NUMBER = "+61 411 111 111";

    const response = await GET(new NextRequest("https://app.example.com/api/cron/voice-synthetic-probe"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.targetNumber).toBe("+61411111111");
    expect(body.targetNumberSource).toBe("VOICE_MONITOR_PROBE_TARGET_NUMBER");
  });

  it("falls back to the known inbound number when no explicit probe target is configured", async () => {
    getKnownEarlymarkInboundNumbers.mockReturnValue(["61499999999"]);

    const response = await GET(new NextRequest("https://app.example.com/api/cron/voice-synthetic-probe"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.targetNumber).toBe("61499999999");
    expect(body.targetNumberSource).toBe("known_inbound_env");
  });

  it("returns degraded when the gateway passes but the real PSTN spoken canary is not configured", async () => {
    runVoiceSpokenPstnCanary.mockResolvedValue({
      status: "degraded",
      summary: "Real PSTN spoken canary is not safe because the probe caller and target number are the same.",
      warnings: ["Use a distinct Twilio-owned or verified outgoing caller ID for VOICE_MONITOR_PROBE_CALLER_NUMBER."],
      mode: "gateway_only",
      configured: true,
      supported: true,
      probeCaller: "+61485010634",
      targetNumber: "+61485010634",
      callSid: null,
      callStatus: null,
      durationSeconds: null,
      expectedPhrase: "Hello Tracey. This is the Earlymark voice monitor probe. Can you hear me?",
      verification: null,
    });

    const response = await GET(new NextRequest("https://app.example.com/api/cron/voice-synthetic-probe"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("degraded");
    expect(body.spokenCanary.mode).toBe("gateway_only");
  });
});
