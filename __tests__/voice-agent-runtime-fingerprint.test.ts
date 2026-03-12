import { describe, expect, it } from "vitest";
import { buildVoiceAgentRuntimeFingerprint } from "@/livekit-agent/runtime-fingerprint";

describe("buildVoiceAgentRuntimeFingerprint", () => {
  it("treats equivalent app/livekit endpoints and inbound number sources as the same runtime", () => {
    const appEnv = {
      LIVEKIT_URL: "https://live.earlymark.ai",
      NEXT_PUBLIC_APP_URL: "https://earlymark.ai",
      LIVEKIT_API_KEY: "app-livekit-key",
      LIVEKIT_API_SECRET: "app-livekit-secret",
      VOICE_AGENT_WEBHOOK_SECRET: "app-webhook-secret",
      DEEPGRAM_API_KEY: "deepgram-a",
      DEEPINFRA_API_KEY: "deepinfra-a",
      GROQ_API_KEY: "groq-a",
      CARTESIA_API_KEY: "cartesia-a",
      TWILIO_PHONE_NUMBER: "+61485010634",
      VOICE_HOST_ID: "voice-host-a",
      VOICE_WORKER_ROLE: "tracey-customer-agent",
      VOICE_WORKER_SURFACES: "normal",
      VOICE_LLM_MODEL: "llama-3.3-70b-versatile",
      VOICE_STT_MODEL: "nova-3",
      VOICE_TTS_VOICE_ID: "voice-id",
    } as unknown as NodeJS.ProcessEnv;

    const workerEnv = {
      LIVEKIT_URL: "http://localhost:7880",
      APP_URL: "https://earlymark.ai",
      LIVEKIT_API_KEY: "worker-livekit-key",
      LIVEKIT_API_SECRET: "worker-livekit-secret",
      DEEPGRAM_API_KEY: "deepgram-b",
      DEEPINFRA_API_KEY: "deepinfra-b",
      GROQ_API_KEY: "groq-b",
      CARTESIA_API_KEY: "cartesia-b",
      EARLYMARK_INBOUND_PHONE_NUMBER: "+61485010634",
      VOICE_HOST_ID: "voice-host-a",
      VOICE_WORKER_ROLE: "tracey-customer-agent",
      VOICE_WORKER_SURFACES: "normal",
      VOICE_LLM_MODEL: "llama-3.3-70b-versatile",
      VOICE_STT_MODEL: "nova-3",
      VOICE_TTS_VOICE_ID: "voice-id",
    } as unknown as NodeJS.ProcessEnv;

    expect(buildVoiceAgentRuntimeFingerprint(workerEnv)).toBe(buildVoiceAgentRuntimeFingerprint(appEnv));
  });

  it("still changes when behavior-shaping runtime config changes", () => {
    const baseEnv = {
      LIVEKIT_URL: "https://live.earlymark.ai",
      NEXT_PUBLIC_APP_URL: "https://earlymark.ai",
      LIVEKIT_API_KEY: "key",
      LIVEKIT_API_SECRET: "secret",
      VOICE_HOST_ID: "voice-host-a",
      VOICE_WORKER_ROLE: "tracey-customer-agent",
      VOICE_WORKER_SURFACES: "normal",
      VOICE_LLM_MODEL: "llama-3.3-70b-versatile",
      VOICE_STT_MODEL: "nova-3",
      VOICE_TTS_VOICE_ID: "voice-id",
    } as unknown as NodeJS.ProcessEnv;

    const driftedEnv = {
      ...baseEnv,
      VOICE_LLM_MODEL: "different-model",
    } as NodeJS.ProcessEnv;

    expect(buildVoiceAgentRuntimeFingerprint(driftedEnv)).not.toBe(buildVoiceAgentRuntimeFingerprint(baseEnv));
  });
});
