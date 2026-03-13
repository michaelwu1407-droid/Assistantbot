import { beforeEach, describe, expect, it, vi } from "vitest";

const { createRoom, createSipParticipant, listSipOutboundTrunk } = vi.hoisted(() => ({
  createRoom: vi.fn(),
  createSipParticipant: vi.fn(),
  listSipOutboundTrunk: vi.fn(),
}));

vi.mock("livekit-server-sdk", () => ({
  RoomServiceClient: class {
    createRoom = createRoom;
  },
  SipClient: class {
    createSipParticipant = createSipParticipant;
    listSipOutboundTrunk = listSipOutboundTrunk;
  },
}));

import { initiateDemoCall, resolveLivekitDemoOutboundTrunk } from "@/lib/demo-call";

describe("demo-call outbound routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LIVEKIT_URL = "wss://live.earlymark.ai";
    process.env.LIVEKIT_API_KEY = "livekit-key";
    process.env.LIVEKIT_API_SECRET = "livekit-secret";
    process.env.EARLYMARK_INBOUND_PHONE_NUMBER = "+61485010634";
    process.env.TWILIO_PHONE_NUMBER = "+61485010634";
    process.env.LIVEKIT_SIP_TRUNK_ID = "ST_stale";
  });

  it("falls back to a valid outbound trunk when the configured trunk id is stale", async () => {
    listSipOutboundTrunk.mockResolvedValue([
      {
        sipTrunkId: "ST_real",
        name: "Earlymark outbound",
        numbers: ["+61485010634"],
        address: "earlymark-outbound.pstn.sydney.twilio.com",
      },
    ]);

    const result = await resolveLivekitDemoOutboundTrunk();

    expect(result.status).toBe("degraded");
    expect(result.resolvedTrunkId).toBe("ST_real");
    expect(result.callerNumber).toBe("+61485010634");
  });

  it("uses the resolved trunk and caller number when initiating a demo call", async () => {
    listSipOutboundTrunk.mockResolvedValue([
      {
        sipTrunkId: "ST_real",
        name: "Earlymark outbound",
        numbers: ["+61485010634"],
        address: "earlymark-outbound.pstn.sydney.twilio.com",
      },
    ]);
    createRoom.mockResolvedValue({});
    createSipParticipant.mockResolvedValue({ participantId: "PA_demo" });

    const result = await initiateDemoCall({
      phone: "0434 955 958",
      firstName: "Michael",
      businessName: "Alexandria Automotive Services",
    });

    expect(createRoom).toHaveBeenCalledTimes(1);
    expect(createSipParticipant).toHaveBeenCalledWith(
      "ST_real",
      "+61434955958",
      expect.stringMatching(/^demo-/),
      expect.objectContaining({
        fromNumber: "+61485010634",
        participantIdentity: "demo-caller-+61434955958",
        participantName: "Michael",
      }),
    );
    expect(result.resolvedTrunkId).toBe("ST_real");
    expect(result.callerNumber).toBe("+61485010634");
  });
});
