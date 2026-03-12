function normalizeSecret(value: string | undefined) {
  return (value || "").trim();
}

export function getAcceptedVoiceAgentSecrets(env: NodeJS.ProcessEnv = process.env): string[] {
  return Array.from(
    new Set(
      [normalizeSecret(env.VOICE_AGENT_WEBHOOK_SECRET), normalizeSecret(env.LIVEKIT_API_SECRET)].filter(Boolean),
    ),
  );
}

export function isVoiceAgentSecretAuthorized(
  providedSecret: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
) {
  const provided = normalizeSecret(providedSecret || undefined);
  if (!provided) return false;
  return getAcceptedVoiceAgentSecrets(env).includes(provided);
}
