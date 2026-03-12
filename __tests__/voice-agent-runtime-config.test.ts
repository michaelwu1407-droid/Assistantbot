import { describe, expect, it } from "vitest";

import {
  assertRequiredVoiceAgentEnv,
  getVoiceAgentAppBaseUrl,
  getVoiceAgentWebhookSecret,
  resolveWorkerHttpHost,
  resolveWorkerHttpPort,
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

  it("requires a dedicated webhook secret in production", () => {
    expect(() => getVoiceAgentWebhookSecret(createEnv({ NODE_ENV: "production", LIVEKIT_API_SECRET: "fallback-only" }))).toThrow(
      /VOICE_AGENT_WEBHOOK_SECRET/,
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
    ).toThrow(/VOICE_AGENT_WEBHOOK_SECRET, CARTESIA_API_KEY, NEXT_PUBLIC_APP_URL\|APP_URL/);
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
        APP_URL: "https://earlymark.ai",
      })),
    ).not.toThrow();
  });
});
