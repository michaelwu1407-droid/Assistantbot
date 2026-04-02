import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { db, twilioState } = vi.hoisted(() => {
  const createCall = vi.fn();
  const fetchCall = vi.fn();
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
      client: { calls } as { calls: typeof calls } | null,
      calls,
      createCall,
      fetchCall,
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

import { runVoiceSpokenPstnCanary } from "@/lib/voice-spoken-canary";

describe("runVoiceSpokenPstnCanary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VOICE_MONITOR_PROBE_MAX_WAIT_SECONDS = "1";
    twilioState.client = { calls: twilioState.calls };
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
    db.voiceCall.findMany.mockResolvedValue([
      {
        callId: "voice_call_1",
        createdAt: new Date("2026-03-17T06:00:05.000Z"),
        startedAt: new Date("2026-03-17T06:00:01.000Z"),
        callerPhone: "+61434955958",
        calledPhone: "+61485010634",
        transcriptText: "Caller: Hello Tracey. This is the voice monitor probe. Can you hear me?\nTracey: Yes, I can hear you clearly.",
      },
    ]);
  });

  afterEach(() => {
    delete process.env.VOICE_MONITOR_PROBE_MAX_WAIT_SECONDS;
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
});
