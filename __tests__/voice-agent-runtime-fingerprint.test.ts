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

  it("treats explicit worker defaults and implicit app defaults as the same runtime", () => {
    const appEnv = {
      LIVEKIT_URL: "https://live.earlymark.ai",
      NEXT_PUBLIC_APP_URL: "https://earlymark.ai",
      TWILIO_PHONE_NUMBER: "+61485010634",
      VOICE_HOST_ID: "voice-host-a",
      VOICE_WORKER_ROLE: "tracey-sales-agent",
      VOICE_WORKER_SURFACES: "demo,inbound_demo",
    } as unknown as NodeJS.ProcessEnv;

    const workerEnv = {
      LIVEKIT_URL: "http://localhost:7880",
      APP_URL: "https://earlymark.ai",
      LIVEKIT_API_KEY: "worker-livekit-key",
      LIVEKIT_API_SECRET: "worker-livekit-secret",
      VOICE_AGENT_WEBHOOK_SECRET: "worker-webhook-secret",
      DEEPGRAM_API_KEY: "deepgram-b",
      DEEPINFRA_API_KEY: "deepinfra-b",
      GROQ_API_KEY: "groq-b",
      CARTESIA_API_KEY: "cartesia-b",
      EARLYMARK_INBOUND_PHONE_NUMBER: "+61485010634",
      VOICE_HOST_ID: "voice-host-a",
      VOICE_WORKER_ROLE: "tracey-sales-agent",
      VOICE_WORKER_SURFACES: "demo,inbound_demo",
      EARLYMARK_VOICE_LLM_PROVIDER: "groq",
      EARLYMARK_VOICE_LLM_MODEL: "llama-3.3-70b-versatile",
      EARLYMARK_VOICE_FALLBACK_LLM_MODEL: "meta-llama/Meta-Llama-3.1-8B-Instruct",
      EARLYMARK_VOICE_LLM_TEMPERATURE: "0.1",
      EARLYMARK_VOICE_LLM_MAX_COMPLETION_TOKENS: "40",
      EARLYMARK_VOICE_STT_ENDPOINTING_MS: "220",
      EARLYMARK_VOICE_MIN_CONSECUTIVE_SPEECH_DELAY_MS: "140",
      EARLYMARK_VOICE_MIN_ENDPOINTING_DELAY_MS: "180",
      EARLYMARK_VOICE_MAX_ENDPOINTING_DELAY_MS: "550",
      EARLYMARK_VOICE_MIN_INTERRUPTION_DURATION_MS: "260",
      EARLYMARK_VOICE_MIN_INTERRUPTION_WORDS: "2",
      INBOUND_VOICE_LLM_MAX_COMPLETION_TOKENS: "32",
      INBOUND_VOICE_STT_ENDPOINTING_MS: "220",
      INBOUND_VOICE_MIN_INTERRUPTION_WORDS: "1",
      VOICE_MAX_ACTIVE_CALLS_SALES: "1",
      VOICE_LATENCY_ENABLED: "true",
      VOICE_LATENCY_TARGET_CALL_TYPES: "normal",
      VOICE_OPENER_BANK_ENABLED: "true",
      VOICE_OPENER_CONFIDENCE_THRESHOLD: "0.72",
      VOICE_GUARD_ENABLED: "true",
      VOICE_GUARD_PROVIDER: "groq",
      VOICE_GUARD_MODEL: "llama-3.1-8b-instant",
      VOICE_GUARD_TIMEOUT_MS: "100",
      VOICE_GUARD_MAX_COMPLETION_TOKENS: "64",
      VOICE_GUARD_TEMPERATURE: "0",
      VOICE_GUARD_MIN_CHARS: "18",
      VOICE_EMPATHY_TURN_GAP: "3",
      VOICE_STT_MODEL: "nova-3",
      VOICE_TTS_VOICE_ID: "a4a16c5e-5902-4732-b9b6-2a48efd2e11b",
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
