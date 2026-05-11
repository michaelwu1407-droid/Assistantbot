import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { db, twilioState } = vi.hoisted(() => {
  const createCall = vi.fn();
  const fetchCall = vi.fn();
  const listIncomingPhoneNumbers = vi.fn();
  const listOutgoingCallerIds = vi.fn();
  const calls = Object.assign(
    vi.fn(() => ({
      fetch: fetchCall,
    })),
    {
      create: createCall,
    },
  );

  return {
    db: {
      voiceCall: {
        findMany: vi.fn(),
      },
    },
    twilioState: {
      client: {
        calls,
        incomingPhoneNumbers: { list: listIncomingPhoneNumbers },
        outgoingCallerIds: { list: listOutgoingCallerIds },
      } as {
        calls: typeof calls;
        incomingPhoneNumbers: { list: typeof listIncomingPhoneNumbers };
        outgoingCallerIds: { list: typeof listOutgoingCallerIds };
      } | null,
      calls,
      createCall,
      fetchCall,
      listIncomingPhoneNumbers,
      listOutgoingCallerIds,
    },
  };
});

vi.mock("@/lib/db", () => ({
  db,
}));

vi.mock("@/lib/twilio", () => ({
  get twilioMasterClient() {
    return twilioState.client;
  },
}));

import { __resetVoiceSpokenCanaryCachesForTests, runVoiceSpokenPstnCanary } from "@/lib/voice-spoken-canary";

describe("runVoiceSpokenPstnCanary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetVoiceSpokenCanaryCachesForTests();
    process.env.VOICE_MONITOR_PROBE_MAX_WAIT_SECONDS = "1";
    process.env.VOICE_MONITOR_PROBE_BUSY_RETRY_COUNT = "1";
    process.env.VOICE_MONITOR_PROBE_BUSY_RETRY_DELAY_SECONDS = "1";
    twilioState.client = {
      calls: twilioState.calls,
      incomingPhoneNumbers: { list: twilioState.listIncomingPhoneNumbers },
      outgoingCallerIds: { list: twilioState.listOutgoingCallerIds },
    };
    twilioState.createCall.mockResolvedValue({
      sid: "CA123",
      status: "queued",
      dateCreated: new Date("2026-03-17T06:00:00.000Z"),
    });
    twilioState.fetchCall.mockResolvedValue({
      sid: "CA123",
      status: "completed",
      duration: "11",
      dateUpdated: new Date("2026-03-17T06:00:11.000Z"),
      endTime: new Date("2026-03-17T06:00:11.000Z"),
    });
    twilioState.listIncomingPhoneNumbers.mockResolvedValue([]);
    twilioState.listOutgoingCallerIds.mockResolvedValue([]);
    db.voiceCall.findMany.mockResolvedValue([
      {
        callId: "voice_call_1",
        createdAt: new Date("2026-03-17T06:00:05.000Z"),
        startedAt: new Date("2026-03-17T06:00:01.000Z"),
        callerPhone: "+61434955958",
        calledPhone: "+61485010634",
        participantIdentity: "sip-participant",
        transcriptText: "Caller: Hello Tracey. This is the voice monitor probe. Can you hear me?\nTracey: Yes, I can hear you clearly.",
        metadata: null,
      },
    ]);
  });

  afterEach(() => {
    __resetVoiceSpokenCanaryCachesForTests();
    delete process.env.VOICE_MONITOR_PROBE_MAX_WAIT_SECONDS;
    delete process.env.VOICE_MONITOR_PROBE_BUSY_RETRY_COUNT;
    delete process.env.VOICE_MONITOR_PROBE_BUSY_RETRY_DELAY_SECONDS;
  });

  it("returns degraded when the probe caller and target are the same number", async () => {
    const result = await runVoiceSpokenPstnCanary({
      probeCaller: "+61485010634",
      targetNumber: "+61485010634",
      checkedAt: new Date("2026-03-17T06:00:00.000Z"),
    });

    expect(result.status).toBe("degraded");
    expect(result.mode).toBe("gateway_only");
    expect(twilioState.createCall).not.toHaveBeenCalled();
  });

  it("returns healthy when Twilio completes and the persisted transcript captures both sides", async () => {
    const result = await runVoiceSpokenPstnCanary({
      probeCaller: "+61434955958",
      targetNumber: "+61485010634",
      checkedAt: new Date("2026-03-17T06:00:00.000Z"),
    });

    expect(result.status).toBe("healthy");
    expect(result.mode).toBe("pstn_spoken");
    expect(result.callSid).toBe("CA123");
    expect(result.callStatus).toBe("completed");
    expect(result.verification?.heardProbePhrase).toBe(true);
    expect(result.verification?.capturedAssistantSpeech).toBe(true);
    expect(result.fallbackReason).toBeNull();
    expect(result.attempts).toEqual([
      expect.objectContaining({
        mode: "pstn_spoken",
        target: "+61485010634",
        callSid: "CA123",
        callStatus: "completed",
      }),
    ]);
    expect(twilioState.createCall).toHaveBeenCalledWith(
      expect.objectContaining({
        twiml: expect.stringContaining('language="en-AU"'),
      }),
    );
    expect(twilioState.createCall).toHaveBeenCalledWith(
      expect.objectContaining({
        twiml: expect.stringContaining('voice="Polly.Nicole"'),
      }),
    );
  });

  it("returns unhealthy when the call completes but no matching VoiceCall is persisted", async () => {
    db.voiceCall.findMany.mockResolvedValue([]);

    const result = await runVoiceSpokenPstnCanary({
      probeCaller: "+61434955958",
      targetNumber: "+61485010634",
      checkedAt: new Date("2026-03-17T06:00:00.000Z"),
    });

    expect(result.status).toBe("unhealthy");
    expect(result.summary).toContain("no matching persisted voice call");
  });

  it("matches the persisted call by startedAt when row creation lags behind the live call", async () => {
    db.voiceCall.findMany.mockResolvedValue([
      {
        callId: "voice_call_delayed",
        createdAt: new Date("2026-03-17T06:00:50.000Z"),
        startedAt: new Date("2026-03-17T06:00:02.000Z"),
        callerPhone: "+61434955958",
        calledPhone: "+61485010634",
        transcriptText: "Caller: Hello Tracey. This is the voice monitor probe.\nTracey: Yes, I can hear you clearly.",
      },
    ]);

    const result = await runVoiceSpokenPstnCanary({
      probeCaller: "+61434955958",
      targetNumber: "+61485010634",
      checkedAt: new Date("2026-03-17T06:00:00.000Z"),
    });

    expect(result.status).toBe("healthy");
    expect(result.verification?.callId).toBe("voice_call_delayed");
  });

  it("treats punctuation and Tracey/Tracy variants as a healthy probe phrase match", async () => {
    db.voiceCall.findMany.mockResolvedValue([
      {
        callId: "voice_call_variant",
        createdAt: new Date("2026-03-17T06:00:05.000Z"),
        startedAt: new Date("2026-03-17T06:00:01.000Z"),
        callerPhone: "+61434955958",
        calledPhone: "+61485010634",
        participantIdentity: "sip-participant",
        transcriptText: "Caller: Hello, Tracy.\nCaller: Monitor probe.\nTracey: Hi, this is Tracey from Earlymark AI. How can I help?",
        metadata: null,
      },
    ]);

    const result = await runVoiceSpokenPstnCanary({
      probeCaller: "+61434955958",
      targetNumber: "+61485010634",
      checkedAt: new Date("2026-03-17T06:00:00.000Z"),
    });

    expect(result.status).toBe("healthy");
    expect(result.verification?.heardProbePhrase).toBe(true);
  });

  it("prefers the persisted call whose metadata matches the originating Twilio call SID", async () => {
    db.voiceCall.findMany.mockResolvedValue([
      {
        callId: "voice_call_nearby",
        createdAt: new Date("2026-03-17T06:00:05.000Z"),
        startedAt: new Date("2026-03-17T06:00:01.000Z"),
        callerPhone: "+61434955958",
        calledPhone: "+61485010634",
        participantIdentity: "sip-participant-nearby",
        transcriptText: "Caller: Hello Tracey.\nTracey: Hi there.",
        metadata: null,
      },
      {
        callId: "voice_call_exact",
        createdAt: new Date("2026-03-17T06:00:07.000Z"),
        startedAt: new Date("2026-03-17T06:00:03.000Z"),
        callerPhone: "+61434955958",
        calledPhone: "+61485010634",
        participantIdentity: "sip-participant-exact",
        transcriptText: "Caller: Hello Tracey. This is the voice monitor probe.\nTracey: Yes, I can hear you clearly.",
        metadata: {
          providerCallIds: {
            twilioCallSid: "CA123",
          },
        },
      },
    ]);

    const result = await runVoiceSpokenPstnCanary({
      probeCaller: "+61434955958",
      targetNumber: "+61485010634",
      checkedAt: new Date("2026-03-17T06:00:00.000Z"),
    });

    expect(result.status).toBe("healthy");
    expect(result.verification?.callId).toBe("voice_call_exact");
  });

  it("falls back to direct SIP when the PSTN number leg returns busy", async () => {
    twilioState.createCall
      .mockResolvedValueOnce({
        sid: "CA_PSTN_1",
        status: "queued",
        dateCreated: new Date("2026-03-17T06:00:00.000Z"),
      })
      .mockResolvedValueOnce({
        sid: "CA_PSTN_2",
        status: "queued",
        dateCreated: new Date("2026-03-17T06:00:02.000Z"),
      })
      .mockResolvedValueOnce({
        sid: "CA_SIP",
        status: "queued",
        dateCreated: new Date("2026-03-17T06:00:04.000Z"),
      });
    twilioState.fetchCall
      .mockResolvedValueOnce({
        sid: "CA_PSTN_1",
        status: "busy",
        duration: "0",
        dateUpdated: new Date("2026-03-17T06:00:01.000Z"),
      })
      .mockResolvedValueOnce({
        sid: "CA_PSTN_2",
        status: "busy",
        duration: "0",
        dateUpdated: new Date("2026-03-17T06:00:03.000Z"),
      })
      .mockResolvedValueOnce({
        sid: "CA_SIP",
        status: "completed",
        duration: "9",
        dateUpdated: new Date("2026-03-17T06:00:11.000Z"),
      });
    db.voiceCall.findMany.mockResolvedValue([
      {
        callId: "voice_call_sip_fallback",
        createdAt: new Date("2026-03-17T06:00:05.000Z"),
        startedAt: new Date("2026-03-17T06:00:03.000Z"),
        callerPhone: "+61434955958",
        calledPhone: "+61485010634",
        participantIdentity: "sip-participant",
        transcriptText: "Caller: Hello Tracey. This is the voice monitor probe. Can you hear me?\nTracey: Yes, I can hear you clearly.",
        metadata: {
          providerCallIds: {
            twilioCallSid: "CA_SIP",
          },
        },
      },
    ]);

    const result = await runVoiceSpokenPstnCanary({
      probeCaller: "+61434955958",
      targetNumber: "+61485010634",
      checkedAt: new Date("2026-03-17T06:00:00.000Z"),
    });

    expect(result.status).toBe("degraded");
    expect(result.mode).toBe("sip_direct");
    expect(result.callSid).toBe("CA_SIP");
    expect(result.callStatus).toBe("completed");
    expect(result.fallbackReason).toBe("pstn_busy");
    expect(result.verification?.callId).toBe("voice_call_sip_fallback");
    expect(result.attempts).toEqual([
      expect.objectContaining({
        mode: "pstn_spoken",
        target: "+61485010634",
        callSid: "CA_PSTN_1",
        callStatus: "busy",
      }),
      expect.objectContaining({
        mode: "pstn_spoken",
        target: "+61485010634",
        callSid: "CA_PSTN_2",
        callStatus: "busy",
      }),
      expect.objectContaining({
        mode: "sip_direct",
        target: "sip:+61485010634@live.earlymark.ai:5060;transport=tcp;region=au1",
        callSid: "CA_SIP",
        callStatus: "completed",
      }),
    ]);
    expect(twilioState.createCall).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        to: "sip:+61485010634@live.earlymark.ai:5060;transport=tcp;region=au1",
      }),
    );
  });

  it("retries a busy PSTN probe once before marking the spoken canary degraded", async () => {
    twilioState.createCall
      .mockResolvedValueOnce({
        sid: "CA_PSTN_1",
        status: "queued",
        dateCreated: new Date("2026-03-17T06:00:00.000Z"),
      })
      .mockResolvedValueOnce({
        sid: "CA_PSTN_2",
        status: "queued",
        dateCreated: new Date("2026-03-17T06:00:02.000Z"),
      });
    twilioState.fetchCall
      .mockResolvedValueOnce({
        sid: "CA_PSTN_1",
        status: "busy",
        duration: "0",
        dateUpdated: new Date("2026-03-17T06:00:01.000Z"),
      })
      .mockResolvedValueOnce({
        sid: "CA_PSTN_2",
        status: "completed",
        duration: "12",
        dateUpdated: new Date("2026-03-17T06:00:15.000Z"),
      });
    db.voiceCall.findMany.mockResolvedValue([
      {
        callId: "voice_call_retry_success",
        createdAt: new Date("2026-03-17T06:00:08.000Z"),
        startedAt: new Date("2026-03-17T06:00:03.000Z"),
        callerPhone: "+61434955958",
        calledPhone: "+61485010634",
        participantIdentity: "sip-participant",
        transcriptText: "Caller: Hello Tracey. This is the voice monitor probe. Can you hear me?\nTracey: Yes, I can hear you clearly.",
        metadata: {
          providerCallIds: {
            twilioCallSid: "CA_PSTN_2",
          },
        },
      },
    ]);

    const result = await runVoiceSpokenPstnCanary({
      probeCaller: "+61434955958",
      targetNumber: "+61485010634",
      checkedAt: new Date("2026-03-17T06:00:00.000Z"),
    });

    expect(result.status).toBe("healthy");
    expect(result.mode).toBe("pstn_spoken");
    expect(result.callSid).toBe("CA_PSTN_2");
    expect(result.callStatus).toBe("completed");
    expect(result.fallbackReason).toBe("pstn_busy_retry");
    expect(result.summary).toContain("after 1 retry");
    expect(result.warnings).toContain("The PSTN probe needed 1 retry after a busy response before succeeding.");
    expect(result.attempts).toEqual([
      expect.objectContaining({
        mode: "pstn_spoken",
        callSid: "CA_PSTN_1",
        callStatus: "busy",
      }),
      expect.objectContaining({
        mode: "pstn_spoken",
        callSid: "CA_PSTN_2",
        callStatus: "completed",
      }),
    ]);
  });

  it("skips the invalid PSTN self-call when both numbers are Twilio-controlled and verifies over direct SIP instead", async () => {
    twilioState.listIncomingPhoneNumbers.mockResolvedValue([
      { phoneNumber: "+61485010634" },
      { phoneNumber: "+12624390786" },
    ]);
    twilioState.listOutgoingCallerIds.mockResolvedValue([{ phoneNumber: "+61434955958" }]);
    twilioState.createCall.mockResolvedValueOnce({
      sid: "CA_SIP_ONLY",
      status: "queued",
      dateCreated: new Date("2026-03-17T06:00:04.000Z"),
    });
    twilioState.fetchCall.mockResolvedValueOnce({
      sid: "CA_SIP_ONLY",
      status: "completed",
      duration: "9",
      dateUpdated: new Date("2026-03-17T06:00:11.000Z"),
    });
    db.voiceCall.findMany.mockResolvedValue([
      {
        callId: "voice_call_sip_only",
        createdAt: new Date("2026-03-17T06:00:05.000Z"),
        startedAt: new Date("2026-03-17T06:00:03.000Z"),
        callerPhone: "+61434955958",
        calledPhone: "+61485010634",
        participantIdentity: "sip-participant",
        transcriptText: "Caller: Hello Tracey. This is the voice monitor probe. Can you hear me?\nTracey: Yes, I can hear you clearly.",
        metadata: {
          providerCallIds: {
            twilioCallSid: "CA_SIP_ONLY",
          },
        },
      },
    ]);

    const result = await runVoiceSpokenPstnCanary({
      probeCaller: "+61434955958",
      targetNumber: "+61485010634",
      checkedAt: new Date("2026-03-17T06:00:00.000Z"),
    });

    expect(result.status).toBe("healthy");
    expect(result.mode).toBe("sip_direct");
    expect(result.fallbackReason).toBe("pstn_self_call_risk");
    expect(result.summary).toContain("Skipped the PSTN self-call canary");
    expect(result.attempts).toEqual([
      expect.objectContaining({
        mode: "sip_direct",
        target: "sip:+61485010634@live.earlymark.ai:5060;transport=tcp;region=au1",
        callSid: "CA_SIP_ONLY",
        callStatus: "completed",
      }),
    ]);
    expect(twilioState.createCall).toHaveBeenCalledTimes(1);
    expect(twilioState.createCall).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "sip:+61485010634@live.earlymark.ai:5060;transport=tcp;region=au1",
      }),
    );
  });
});
