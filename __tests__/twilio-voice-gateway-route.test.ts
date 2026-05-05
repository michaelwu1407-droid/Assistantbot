import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getKnownEarlymarkInboundNumbers,
  isKnownEarlymarkInboundNumber,
  getEarlymarkInboundSipUri,
  getVoiceFleetHealth,
  isVoiceSurfaceRoutable,
  reconcileVoiceIncidents,
  findManagedTwilioNumberByPhone,
  findWorkspaceByTwilioNumber,
} = vi.hoisted(() => ({
  getKnownEarlymarkInboundNumbers: vi.fn(),
  isKnownEarlymarkInboundNumber: vi.fn(),
  getEarlymarkInboundSipUri: vi.fn(),
  getVoiceFleetHealth: vi.fn(),
  isVoiceSurfaceRoutable: vi.fn(),
  reconcileVoiceIncidents: vi.fn(),
  findManagedTwilioNumberByPhone: vi.fn(),
  findWorkspaceByTwilioNumber: vi.fn(),
}));

vi.mock("@/lib/earlymark-inbound-config", () => ({
  getExpectedVoiceGatewayUrl: vi.fn(),
  getKnownEarlymarkInboundNumbers,
  isKnownEarlymarkInboundNumber,
}));
vi.mock("@/lib/livekit-sip-config", () => ({
  getEarlymarkInboundSipUri,
}));
vi.mock("@/lib/phone-utils", () => ({
  phoneMatches: vi.fn(() => false),
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

function buildRequest(fields?: Record<string, string>) {
  return new NextRequest("https://app.example.com/api/webhooks/twilio-voice-gateway", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: "+61400000000",
      To: "+61411111111",
      ...(fields || {}),
    }).toString(),
  });
}

describe("POST /api/webhooks/twilio-voice-gateway", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "test");
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    delete process.env.TWILIO_ACCOUNT_SID;
    getKnownEarlymarkInboundNumbers.mockReturnValue([]);
    isKnownEarlymarkInboundNumber.mockReturnValue(false);
    getEarlymarkInboundSipUri.mockReturnValue("sip:+61485010634@live.earlymark.ai:5060");
    getVoiceFleetHealth.mockResolvedValue({ status: "healthy", summary: "healthy fleet" });
    isVoiceSurfaceRoutable.mockReturnValue(true);
    reconcileVoiceIncidents.mockResolvedValue([]);
    findManagedTwilioNumberByPhone.mockResolvedValue(null);
    findWorkspaceByTwilioNumber.mockResolvedValue(null);
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.TWILIO_ACCOUNT_SID;
  });

  it("routes orphaned numbers to voicemail fallback instead of SIP forwarding", async () => {
    findManagedTwilioNumberByPhone.mockResolvedValue({
      managed: true,
      surface: "normal",
      workspace: { id: "ws_orphaned" },
    });

    const response = await POST(buildRequest());
    const twiml = await response.text();

    expect(response.status).toBe(200);
    expect(twiml).toContain("Please leave a message for the team");
    expect(twiml).toContain("/api/webhooks/twilio-voice-fallback?surface=normal");
    expect(twiml).not.toContain("<Sip>");
  });

  it("routes voice-disabled workspaces to voicemail fallback", async () => {
    findWorkspaceByTwilioNumber.mockResolvedValue({
      id: "ws_1",
      twilioSubaccountId: "ACsub123",
      voiceEnabled: false,
    });

    const response = await POST(buildRequest());
    const twiml = await response.text();

    expect(response.status).toBe(200);
    expect(twiml).toContain("Please leave a message for the team");
    expect(twiml).not.toContain("<Sip>");
  });
});
