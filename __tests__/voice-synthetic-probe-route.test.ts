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
} = vi.hoisted(() => ({
  getExpectedVoiceGatewayUrl: vi.fn(),
  getKnownEarlymarkInboundNumbers: vi.fn(),
  getEarlymarkInboundSipUri: vi.fn(),
  recordMonitorRun: vi.fn(),
  isOpsAuthorized: vi.fn(),
  dispatchVoiceIncidentNotifications: vi.fn(),
  reconcileVoiceIncidents: vi.fn(),
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
});
