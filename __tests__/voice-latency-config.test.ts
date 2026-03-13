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
  });
});
