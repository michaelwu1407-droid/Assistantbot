import { beforeEach, describe, expect, it, vi } from "vitest";

const { createRoom, createSipParticipant, listSipOutboundTrunk, listSipInboundTrunk } = vi.hoisted(() => ({
  createRoom: vi.fn(),
  createSipParticipant: vi.fn(),
  listSipOutboundTrunk: vi.fn(),
  listSipInboundTrunk: vi.fn(),
}));

vi.mock("livekit-server-sdk", () => ({
  RoomServiceClient: class {
    createRoom = createRoom;
  },
  SipClient: class {
    createSipParticipant = createSipParticipant;
    listSipOutboundTrunk = listSipOutboundTrunk;
    listSipInboundTrunk = listSipInboundTrunk;
  },
}));

import {
  initiateDemoCall,
  isValidE164Phone,
  resolveLivekitDemoOutboundTrunk,
} from "@/lib/demo-call";

describe("demo-call outbound routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LIVEKIT_URL = "wss://live.earlymark.ai";
    process.env.LIVEKIT_API_KEY = "livekit-key";
    process.env.LIVEKIT_API_SECRET = "livekit-secret";
    process.env.EARLYMARK_INBOUND_PHONE_NUMBER = "+61485010634";
    process.env.TWILIO_PHONE_NUMBER = "+61485010634";
    process.env.LIVEKIT_SIP_TRUNK_ID = "ST_stale";
    listSipInboundTrunk.mockResolvedValue([
      {
        sipTrunkId: "ST_inbound",
        name: "Earlymark inbound",
        numbers: ["+61485010634"],
      },
    ]);
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

  it("rejects malformed phone numbers before contacting LiveKit", async () => {
    listSipOutboundTrunk.mockResolvedValue([
      {
        sipTrunkId: "ST_real",
        name: "Earlymark outbound",
        numbers: ["+61485010634"],
        address: "earlymark-outbound.pstn.sydney.twilio.com",
      },
    ]);

    await expect(
      initiateDemoCall({ phone: "12345", firstName: "Alex" }),
    ).rejects.toThrow(/not a valid international number/);
    expect(createRoom).not.toHaveBeenCalled();
    expect(createSipParticipant).not.toHaveBeenCalled();
  });

  it("warns when no caller number can be resolved but still attempts the call", async () => {
    delete process.env.EARLYMARK_INBOUND_PHONE_NUMBER;
    delete process.env.TWILIO_PHONE_NUMBER;
    delete process.env.EARLYMARK_INBOUND_PHONE_NUMBERS;
    delete process.env.EARLYMARK_PHONE_NUMBER;
    delete process.env.LIVEKIT_SIP_TRUNK_ID;
    listSipInboundTrunk.mockResolvedValue([]);

    listSipOutboundTrunk.mockResolvedValue([
      {
        sipTrunkId: "ST_no_caller",
        name: "Earlymark outbound",
        numbers: ["*"],
        address: "earlymark-outbound.pstn.sydney.twilio.com",
      },
    ]);
    createRoom.mockResolvedValue({});
    createSipParticipant.mockResolvedValue({ participantId: "PA_demo" });

    const result = await initiateDemoCall({
      phone: "+61434955958",
      firstName: "Sam",
    });

    expect(result.callerNumber).toBeNull();
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringMatching(/caller number/i)]),
    );
    expect(createSipParticipant).toHaveBeenCalledWith(
      "ST_no_caller",
      "+61434955958",
      expect.stringMatching(/^demo-/),
      expect.objectContaining({ fromNumber: undefined }),
    );
  });

  it("falls back to LiveKit inbound trunk numbers when env caller numbers are missing", async () => {
    delete process.env.EARLYMARK_INBOUND_PHONE_NUMBER;
    delete process.env.TWILIO_PHONE_NUMBER;
    delete process.env.EARLYMARK_INBOUND_PHONE_NUMBERS;
    delete process.env.EARLYMARK_PHONE_NUMBER;
    delete process.env.LIVEKIT_SIP_TRUNK_ID;

    listSipOutboundTrunk.mockResolvedValue([
      {
        sipTrunkId: "ST_wildcard",
        name: "Earlymark outbound",
        numbers: ["*"],
        address: "earlymark-outbound.pstn.sydney.twilio.com",
      },
    ]);
    createRoom.mockResolvedValue({});
    createSipParticipant.mockResolvedValue({ participantId: "PA_demo" });

    const result = await initiateDemoCall({
      phone: "+61434955958",
      firstName: "Sam",
    });

    expect(result.callerNumber).toBe("+61485010634");
    expect(result.warnings).toEqual([]);
    expect(createSipParticipant).toHaveBeenCalledWith(
      "ST_wildcard",
      "+61434955958",
      expect.stringMatching(/^demo-/),
      expect.objectContaining({ fromNumber: "+61485010634" }),
    );
  });

  it("validates E.164 phone numbers", () => {
    expect(isValidE164Phone("+61434955958")).toBe(true);
    expect(isValidE164Phone("+15551234567")).toBe(true);
    expect(isValidE164Phone("+1234567")).toBe(false);
    expect(isValidE164Phone("0434955958")).toBe(false);
    expect(isValidE164Phone("+0434955958")).toBe(false);
    expect(isValidE164Phone("")).toBe(false);
  });
});
