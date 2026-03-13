import { describe, expect, it } from "vitest";

import {
  assertRequiredVoiceAgentEnv,
  getVoiceAgentAppBaseUrl,
  getVoiceAgentWebhookSecret,
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
    ).toThrow(/CARTESIA_API_KEY, DEEPGRAM_API_KEY, NEXT_PUBLIC_APP_URL\|APP_URL, GROQ_API_KEY\|DEEPINFRA_API_KEY/);
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
