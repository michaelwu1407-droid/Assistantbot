import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createRoom,
  createSipParticipant,
  listSipOutboundTrunk,
  listSipInboundTrunk,
  createTwilioCall,
  fetchTwilioCall,
  updateTwilioCall,
  twilioCalls,
  getParticipant,
  deleteRoom,
} = vi.hoisted(() => {
  const createTwilioCall = vi.fn();
  const fetchTwilioCall = vi.fn();
  const updateTwilioCall = vi.fn();
  const twilioCalls = Object.assign(
    vi.fn(() => ({
      fetch: fetchTwilioCall,
      update: updateTwilioCall,
    })),
    { create: createTwilioCall },
  );

  return {
    createRoom: vi.fn(),
    createSipParticipant: vi.fn(),
    listSipOutboundTrunk: vi.fn(),
    listSipInboundTrunk: vi.fn(),
    createTwilioCall,
    fetchTwilioCall,
    updateTwilioCall,
    twilioCalls,
    getParticipant: vi.fn(),
    deleteRoom: vi.fn(),
  };
});

vi.mock("livekit-server-sdk", () => ({
  RoomServiceClient: class {
    createRoom = createRoom;
    getParticipant = getParticipant;
    deleteRoom = deleteRoom;
  },
  SipClient: class {
    createSipParticipant = createSipParticipant;
    listSipOutboundTrunk = listSipOutboundTrunk;
    listSipInboundTrunk = listSipInboundTrunk;
  },
}));

vi.mock("@/lib/twilio", () => ({
  twilioMasterClient: {
    calls: twilioCalls,
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
    process.env.DEMO_CALL_CONNECTION_TIMEOUT_MS = "5";
    process.env.DEMO_CALL_CONNECTION_POLL_MS = "1";
    process.env.VOICE_MONITOR_PROBE_CALLER_NUMBER = "+61434955958";
    createTwilioCall.mockResolvedValue({ sid: "CA_demo", status: "queued" });
    fetchTwilioCall.mockResolvedValue({ status: "ringing" });
    updateTwilioCall.mockResolvedValue({ status: "canceled" });
    getParticipant.mockResolvedValue({
      attributes: {
        "sip.callStatus": "active",
      },
    });
    deleteRoom.mockResolvedValue(undefined);
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
    expect(result.transport).toBe("livekit_control");
    expect(result.callSid).toBeNull();
    expect(result.connectionVerified).toBe(true);
    expect(result.sipCallStatus).toBe("active");
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

  it("falls back to a Twilio SIP bridge when the LiveKit control API is unreachable", async () => {
    listSipOutboundTrunk.mockRejectedValue(new TypeError("fetch failed"));

    const result = await initiateDemoCall({
      phone: "0434 955 958",
      firstName: "Michael",
      businessName: "Alexandria Automotive Services",
    });

    expect(createRoom).not.toHaveBeenCalled();
    expect(createSipParticipant).not.toHaveBeenCalled();
    expect(createTwilioCall).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "+61434955958",
        from: "+61485010634",
        twiml: expect.stringContaining("<Sip>sip:+61485010634@live.earlymark.ai:5060;transport=tcp;region=au1</Sip>"),
      }),
    );
    expect(result.roomName).toBe("twilio-bridge-CA_demo");
    expect(result.resolvedTrunkId).toBe("twilio-sip-bridge:+61485010634");
    expect(result.transport).toBe("twilio_sip_bridge");
    expect(result.callSid).toBe("CA_demo");
    expect(result.connectionVerified).toBe(true);
    expect(result.sipCallStatus).toBe("ringing");
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringMatching(/Twilio SIP bridge fallback/i)]),
    );
  });

  it("prefers the real outbound caller number over the monitor probe caller number for fallback calls", async () => {
    listSipOutboundTrunk.mockRejectedValue(new TypeError("fetch failed"));

    const result = await initiateDemoCall({
      phone: "0434 955 958",
      firstName: "Michael",
    });

    expect(createTwilioCall).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "+61485010634",
      }),
    );
    expect(result.callerNumber).toBe("+61485010634");
  });

  it("uses the Twilio SIP bridge immediately when preferred for public callbacks", async () => {
    const result = await initiateDemoCall(
      {
        phone: "0434 955 958",
        firstName: "Michael",
        businessName: "Alexandria Automotive Services",
      },
      {
        preferTwilioSipBridge: true,
        waitForConnection: false,
      },
    );

    expect(listSipOutboundTrunk).not.toHaveBeenCalled();
    expect(createRoom).not.toHaveBeenCalled();
    expect(createSipParticipant).not.toHaveBeenCalled();
    expect(createTwilioCall).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "+61434955958",
        from: "+61485010634",
        timeout: 20,
        twiml: expect.stringContaining("<Sip>sip:+61485010634@live.earlymark.ai:5060;transport=tcp;region=au1</Sip>"),
      }),
    );
    expect(result.roomName).toBe("twilio-bridge-CA_demo");
    expect(result.resolvedTrunkId).toBe("twilio-sip-bridge:+61485010634");
    expect(result.transport).toBe("twilio_sip_bridge");
    expect(result.callSid).toBe("CA_demo");
    expect(result.connectionVerified).toBe(false);
    expect(result.sipCallStatus).toBe("queued");
    expect(result.warnings).toEqual([]);
  });

  it("falls back to the Twilio bridge when the LiveKit outbound leg never connects", async () => {
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
    getParticipant.mockResolvedValue({
      attributes: {
        "sip.callStatus": "dialing",
      },
    });

    const result = await initiateDemoCall({
      phone: "0434 955 958",
      firstName: "Michael",
      businessName: "Alexandria Automotive Services",
    });

    expect(deleteRoom).toHaveBeenCalledWith(expect.stringMatching(/^demo-/));
    expect(createTwilioCall).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "+61434955958",
        from: "+61485010634",
      }),
    );
    expect(result.transport).toBe("twilio_sip_bridge");
    expect(result.connectionVerified).toBe(true);
    expect(result.sipCallStatus).toBe("ringing");
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringMatching(/LiveKit control API failed/i)]),
    );
  });

  it("throws when the preferred Twilio bridge never reaches the handset", async () => {
    fetchTwilioCall.mockResolvedValue({ status: "queued" });

    await expect(initiateDemoCall(
      {
        phone: "0434 955 958",
        firstName: "Michael",
        businessName: "Alexandria Automotive Services",
      },
      {
        preferTwilioSipBridge: true,
        waitForConnection: true,
        allowTwilioSipBridgeFallback: false,
      },
    )).rejects.toThrow(/Twilio SIP bridge demo call did not reach the handset \(last Twilio status: queued\)/i);

    expect(updateTwilioCall).toHaveBeenCalledWith({ status: "canceled" });
  });

  it("can skip connection polling for the public callback path", async () => {
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

    const result = await initiateDemoCall(
      {
        phone: "0434 955 958",
        firstName: "Michael",
        businessName: "Alexandria Automotive Services",
      },
      {
        waitForConnection: false,
        allowTwilioSipBridgeFallback: false,
      },
    );

    expect(getParticipant).not.toHaveBeenCalled();
    expect(deleteRoom).not.toHaveBeenCalled();
    expect(result.transport).toBe("livekit_control");
    expect(result.connectionVerified).toBe(false);
    expect(result.sipCallStatus).toBe("initiated");
    expect(result.warnings).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/still/i)]),
    );
  });

  it("throws on a pending LiveKit outbound leg when bridge fallback is disabled", async () => {
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
    getParticipant.mockResolvedValue({
      attributes: {
        "sip.callStatus": "dialing",
      },
    });

    await expect(initiateDemoCall(
      {
        phone: "0434 955 958",
        firstName: "Michael",
        businessName: "Alexandria Automotive Services",
      },
      {
        allowTwilioSipBridgeFallback: false,
      },
    )).rejects.toThrow(/LiveKit outbound demo call did not connect \(last SIP status: dialing\)/i);

    expect(deleteRoom).toHaveBeenCalledWith(expect.stringMatching(/^demo-/));
    expect(createTwilioCall).not.toHaveBeenCalled();
  });

  it("never uses the monitor probe caller number as a demo fallback caller id", async () => {
    delete process.env.EARLYMARK_INBOUND_PHONE_NUMBER;
    delete process.env.TWILIO_PHONE_NUMBER;
    delete process.env.EARLYMARK_INBOUND_PHONE_NUMBERS;
    delete process.env.EARLYMARK_PHONE_NUMBER;
    listSipOutboundTrunk.mockRejectedValue(new TypeError("fetch failed"));

    await expect(
      initiateDemoCall({
        phone: "0434 955 958",
        firstName: "Michael",
      }),
    ).rejects.toThrow(/No Twilio caller number is configured for demo-call fallback/i);

    expect(createTwilioCall).not.toHaveBeenCalled();
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
