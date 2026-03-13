import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getExpectedVoiceGatewayUrl,
  getKnownEarlymarkInboundNumbers,
  isKnownEarlymarkInboundNumber,
  getLivekitSipTerminationUri,
  getVoiceFleetHealth,
  isVoiceSurfaceRoutable,
  reconcileVoiceIncidents,
  findManagedTwilioNumberByPhone,
  findWorkspaceByTwilioNumber,
} = vi.hoisted(() => ({
  getExpectedVoiceGatewayUrl: vi.fn(),
  getKnownEarlymarkInboundNumbers: vi.fn(),
  isKnownEarlymarkInboundNumber: vi.fn(),
  getLivekitSipTerminationUri: vi.fn(),
  getVoiceFleetHealth: vi.fn(),
  isVoiceSurfaceRoutable: vi.fn(),
  reconcileVoiceIncidents: vi.fn(),
  findManagedTwilioNumberByPhone: vi.fn(),
  findWorkspaceByTwilioNumber: vi.fn(),
}));

vi.mock("@/lib/earlymark-inbound-config", () => ({
  getExpectedVoiceGatewayUrl,
  getKnownEarlymarkInboundNumbers,
  isKnownEarlymarkInboundNumber,
}));

vi.mock("@/lib/livekit-sip-config", () => ({
  getLivekitSipTerminationUri,
}));

vi.mock("@/lib/voice-fleet", () => ({
  getVoiceFleetHealth,
  isVoiceSurfaceRoutable,
}));

vi.mock("@/lib/voice-incidents", () => ({
  reconcileVoiceIncidents,
}));

vi.mock("@/lib/twilio-drift", () => ({
  findManagedTwilioNumberByPhone,
}));

vi.mock("@/lib/workspace-routing", () => ({
  findWorkspaceByTwilioNumber,
}));

import { POST } from "@/app/api/webhooks/twilio-voice-gateway/route";

function buildRequest(headers?: Record<string, string>) {
  return new NextRequest("https://app.example.com/api/webhooks/twilio-voice-gateway", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(headers || {}),
    },
    body: new URLSearchParams({
      From: "+61434955958",
      To: "+61485010634",
    }).toString(),
  });
}

describe("POST /api/webhooks/twilio-voice-gateway synthetic probe auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.TWILIO_ACCOUNT_SID = "AC123";
    process.env.CRON_SECRET = "probe-secret";

    getExpectedVoiceGatewayUrl.mockReturnValue("https://app.example.com/api/webhooks/twilio-voice-gateway");
    getKnownEarlymarkInboundNumbers.mockReturnValue(["+61485010634"]);
    isKnownEarlymarkInboundNumber.mockImplementation((phone: string) => phone === "+61485010634" || phone === "61485010634");
    getLivekitSipTerminationUri.mockReturnValue("earlymark-outbound.pstn.sydney.twilio.com");
    getVoiceFleetHealth.mockResolvedValue({ status: "healthy", summary: "healthy fleet" });
    isVoiceSurfaceRoutable.mockReturnValue(true);
    reconcileVoiceIncidents.mockResolvedValue([]);
    findManagedTwilioNumberByPhone.mockResolvedValue(null);
    findWorkspaceByTwilioNumber.mockResolvedValue(null);
  });

  afterEach(() => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.CRON_SECRET;
  });

  it("routes a real call from the probe phone number through the voice gateway", async () => {
    const response = await POST(buildRequest());
    const twiml = await response.text();

    expect(twiml).toContain("<Sip>earlymark-outbound.pstn.sydney.twilio.com</Sip>");
    expect(twiml).not.toContain("VOICE MONITOR PROBE PASS");
  });

  it("keeps workspace calls on the workspace subaccount SIP domain", async () => {
    isKnownEarlymarkInboundNumber.mockReturnValue(false);
    findWorkspaceByTwilioNumber.mockResolvedValue({
      id: "ws_123",
      twilioSubaccountId: "ACSUB123",
      voiceEnabled: true,
    });

    const response = await POST(
      new NextRequest("https://app.example.com/api/webhooks/twilio-voice-gateway", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: "+61400000000",
          To: "+61411111111",
        }).toString(),
      }),
    );
    const twiml = await response.text();

    expect(twiml).toContain("<Sip>ACSUB123.pstn.twilio.com</Sip>");
  });

  it("keeps authenticated internal probes on the same resolved SIP route", async () => {
    const response = await POST(
      buildRequest({
        "x-voice-probe-key": "probe-secret",
      }),
    );
    const twiml = await response.text();

    expect(twiml).toContain("<Sip>earlymark-outbound.pstn.sydney.twilio.com</Sip>");
    expect(twiml).not.toContain("VOICE MONITOR PROBE PASS");
  });
});
