import { describe, expect, it } from "vitest";
import { getAcceptedVoiceAgentSecrets, isVoiceAgentSecretAuthorized } from "@/lib/voice-agent-auth";

describe("voice-agent-auth", () => {
  it("accepts either configured secret when both are present", () => {
    const env = {
      VOICE_AGENT_WEBHOOK_SECRET: "webhook-secret",
      LIVEKIT_API_SECRET: "livekit-secret",
    } as unknown as NodeJS.ProcessEnv;

    expect(getAcceptedVoiceAgentSecrets(env)).toEqual(["webhook-secret", "livekit-secret"]);
    expect(isVoiceAgentSecretAuthorized("webhook-secret", env)).toBe(true);
    expect(isVoiceAgentSecretAuthorized("livekit-secret", env)).toBe(true);
    expect(isVoiceAgentSecretAuthorized("wrong-secret", env)).toBe(false);
  });

  it("deduplicates identical secrets", () => {
    const env = {
      VOICE_AGENT_WEBHOOK_SECRET: "same-secret",
      LIVEKIT_API_SECRET: "same-secret",
    } as unknown as NodeJS.ProcessEnv;

    expect(getAcceptedVoiceAgentSecrets(env)).toEqual(["same-secret"]);
  });
});
