import { afterEach, describe, expect, it } from "vitest";
import voiceLatency from "@/livekit-agent/voice-latency";
import { buildVoiceAgentRuntimeFingerprintSource } from "@/livekit-agent/runtime-fingerprint";

const ORIGINAL_ENV = { ...process.env };

describe("voice latency defaults", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("includes inbound Earlymark calls in the default latency target set", () => {
    delete process.env.VOICE_LATENCY_TARGET_CALL_TYPES;
    process.env.VOICE_LATENCY_ENABLED = "true";
    process.env.VOICE_GUARD_ENABLED = "false";

    const config = voiceLatency.resolveVoiceLatencyConfig({
      callType: "inbound_demo",
      llmProvider: "groq",
      llmModel: "llama-3.3-70b-versatile",
      llmApiKey: "groq-key",
      llmBaseURL: "https://api.groq.com/openai/v1",
    });

    expect(config.enabled).toBe(true);
    expect(config.targetCallTypes).toEqual(["demo", "inbound_demo", "normal"]);
  });

  it("reports the expanded default target set in the runtime fingerprint", () => {
    const source = buildVoiceAgentRuntimeFingerprintSource({
      LIVEKIT_URL: "https://live.earlymark.ai",
      NEXT_PUBLIC_APP_URL: "https://earlymark.ai",
      VOICE_HOST_ID: "voice-host-a",
      VOICE_WORKER_ROLE: "tracey-sales-agent",
      VOICE_WORKER_SURFACES: "demo,inbound_demo",
    } as unknown as NodeJS.ProcessEnv);

    expect(source.VOICE_LATENCY_TARGET_CALL_TYPES).toBe("demo,inbound_demo,normal");
    expect(source.VOICE_SPECULATIVE_HEADS_ENABLED).toBe("false");
    expect(source.VOICE_REQUIRE_GUARD_FOR_OPENERS).toBe("true");
  });

  it("keeps speculative sales heads off by default", () => {
    delete process.env.VOICE_SPECULATIVE_HEADS_ENABLED;
    delete process.env.VOICE_SPECULATIVE_HEADS_SURFACES;
    process.env.VOICE_LATENCY_ENABLED = "true";
    process.env.VOICE_GUARD_ENABLED = "false";

    const config = voiceLatency.resolveVoiceLatencyConfig({
      callType: "demo",
      llmProvider: "groq",
      llmModel: "llama-3.3-70b-versatile",
      llmApiKey: "groq-key",
      llmBaseURL: "https://api.groq.com/openai/v1",
    });

    expect(config.speculativeHeadsEnabled).toBe(false);
    expect(config.requireGuardForOpeners).toBe(true);
  });

  it("does not speak cached openers without a guard approval by default", () => {
    const prediction = {
      ...voiceLatency.predictVoiceTurn("What services do you offer?", "final"),
      intent: "lookup" as const,
      confidence: 0.9,
      openerCategory: "lookup" as const,
      allowOpener: true,
    };

    expect(
      voiceLatency.resolveOpenerEntry({
        prediction,
        guardDecision: null,
        requireGuardDecision: true,
        userTurnIndex: 1,
        lastEmpatheticTurnIndex: -10,
        empathyTurnGap: 3,
      }),
    ).toBeNull();

    expect(
      voiceLatency.resolveOpenerEntry({
        prediction,
        guardDecision: {
          allowOpener: true,
          openerId: "let_me_check",
          route: "lookup_first",
          riskLevel: "low",
          confidence: 0.94,
          reason: "safe lookup opener",
          timedOut: false,
          fromModel: true,
        },
        requireGuardDecision: true,
        userTurnIndex: 1,
        lastEmpatheticTurnIndex: -10,
        empathyTurnGap: 3,
      })?.id,
    ).toBe("let_me_check");
  });

  it("does not use broad general turns for speculative sales heads", () => {
    const generalPrediction = {
      ...voiceLatency.predictVoiceTurn("That sounds interesting.", "interim"),
      intent: "general" as const,
      riskLevel: "low" as const,
    };

    expect(
      voiceLatency.resolveSpeculativeHeadEntry({
        callType: "demo",
        prediction: generalPrediction,
      }),
    ).toBeNull();
  });

  it("never uses speculative sales heads on normal customer calls", () => {
    const lookupPrediction = {
      ...voiceLatency.predictVoiceTurn("What services do you offer?", "interim"),
      intent: "lookup" as const,
      riskLevel: "low" as const,
    };

    expect(
      voiceLatency.resolveSpeculativeHeadEntry({
        callType: "normal",
        prediction: lookupPrediction,
      }),
    ).toBeNull();
  });

  it("uses fast fixed replies for low-signal inbound-demo greetings and hearing checks", () => {
    expect(voiceLatency.resolveInboundDemoFastReplyId("Hello, Tracy.")).toBe("inbound_demo_hello_ack");
    expect(voiceLatency.resolveInboundDemoFastReplyId("Voice monitor probe")).toBe("inbound_demo_can_hear_you");
    expect(voiceLatency.resolveInboundDemoFastReplyId("Can you hear me?")).toBe("inbound_demo_can_hear_you");
    expect(voiceLatency.resolveInboundDemoFastReplyId("Can you help me book a demo?")).toBeNull();
  });
});
