import { describe, expect, it } from "vitest";

import {
  assertRequiredVoiceAgentEnv,
  getVoiceAgentAppBaseUrl,
  getVoiceAgentWebhookSecret,
  getVoiceWorkerHealthPath,
  getVoiceWorkerHealthStaleMs,
  resolveWorkerHttpHost,
  resolveWorkerHttpPort,
  shouldEnableNoiseCancellation,
} from "@/livekit-agent/runtime-config";

function createEnv(overrides: Record<string, string> = {}) {
  return overrides as unknown as NodeJS.ProcessEnv;
}

describe("voice agent runtime config", () => {
  it("uses explicit worker host and port when provided", () => {
    expect(resolveWorkerHttpHost(createEnv({ LIVEKIT_HTTP_HOST: "127.0.0.1" }))).toBe("127.0.0.1");
    expect(resolveWorkerHttpPort(createEnv({ LIVEKIT_HTTP_PORT: "8082" }))).toBe(8082);
  });

  it("falls back to loopback and the default port when worker port config is absent", () => {
    expect(resolveWorkerHttpHost(createEnv())).toBe("127.0.0.1");
    expect(resolveWorkerHttpPort(createEnv())).toBe(8081);
  });

  it("uses a stable worker health snapshot path and stale threshold by default", () => {
    expect(getVoiceWorkerHealthPath(createEnv())).toBe("/tmp/voice-worker-health.json");
    expect(getVoiceWorkerHealthStaleMs(createEnv())).toBe(180000);
  });

  it("accepts explicit worker health snapshot config", () => {
    expect(
      getVoiceWorkerHealthPath(
        createEnv({
          VOICE_WORKER_HEALTH_PATH: "/var/run/earlymark/voice-health.json",
          VOICE_WORKER_HEALTH_STALE_MS: "60000",
        }),
      ),
    ).toBe("/var/run/earlymark/voice-health.json");
    expect(getVoiceWorkerHealthStaleMs(createEnv({ VOICE_WORKER_HEALTH_STALE_MS: "60000" }))).toBe(60000);
  });

  it("uses localhost only outside production when no app URL env is set", () => {
    expect(getVoiceAgentAppBaseUrl(createEnv({ NODE_ENV: "development" }))).toBe("http://localhost:3000");
  });

  it("requires an explicit production app URL", () => {
    expect(() => getVoiceAgentAppBaseUrl(createEnv({ NODE_ENV: "production" }))).toThrow(
      /NEXT_PUBLIC_APP_URL or APP_URL/,
    );
  });

  it("falls back to the LiveKit API secret in production when a dedicated webhook secret is absent", () => {
    expect(getVoiceAgentWebhookSecret(createEnv({ NODE_ENV: "production", LIVEKIT_API_SECRET: "fallback-only" }))).toBe(
      "fallback-only",
    );
  });

  it("rejects production startup when required env is missing", () => {
    expect(() =>
      assertRequiredVoiceAgentEnv(createEnv({
        NODE_ENV: "production",
        LIVEKIT_URL: "wss://livekit.example.com",
        LIVEKIT_API_KEY: "livekit-key",
        LIVEKIT_API_SECRET: "livekit-secret",
      })),
    ).toThrow(/CARTESIA_API_KEY, DEEPGRAM_API_KEY, VOICE_TTS_VOICE_ID, VOICE_TTS_LANGUAGE, NEXT_PUBLIC_APP_URL\|APP_URL, GROQ_API_KEY\|DEEPINFRA_API_KEY/);
  });

  it("accepts a complete production worker env", () => {
    expect(() =>
      assertRequiredVoiceAgentEnv(createEnv({
        NODE_ENV: "production",
        LIVEKIT_URL: "wss://livekit.example.com",
        LIVEKIT_API_KEY: "livekit-key",
        LIVEKIT_API_SECRET: "livekit-secret",
        VOICE_AGENT_WEBHOOK_SECRET: "voice-webhook-secret",
        CARTESIA_API_KEY: "cartesia-key",
        DEEPGRAM_API_KEY: "deepgram-key",
        GROQ_API_KEY: "groq-key",
        VOICE_TTS_VOICE_ID: "a4a16c5e-5902-4732-b9b6-2a48efd2e11b",
        VOICE_TTS_LANGUAGE: "en-AU",
        APP_URL: "https://earlymark.ai",
      })),
    ).not.toThrow();
  });

  it("disables noise cancellation by default on self-hosted LiveKit", () => {
    expect(shouldEnableNoiseCancellation(createEnv({ LIVEKIT_URL: "http://localhost:7880" }))).toBe(false);
  });

  it("enables noise cancellation automatically for LiveKit Cloud or when explicitly forced", () => {
    expect(shouldEnableNoiseCancellation(createEnv({ LIVEKIT_URL: "wss://project.livekit.cloud" }))).toBe(true);
    expect(
      shouldEnableNoiseCancellation(createEnv({
        LIVEKIT_URL: "http://localhost:7880",
        LIVEKIT_ENABLE_NOISE_CANCELLATION: "true",
      })),
    ).toBe(true);
  });
});
