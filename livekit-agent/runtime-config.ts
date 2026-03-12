const DEFAULT_LOCAL_APP_URL = "http://localhost:3000";

export const DEFAULT_WORKER_HTTP_HOST = "127.0.0.1";
export const DEFAULT_WORKER_HTTP_PORT = 8081;

const REQUIRED_PRODUCTION_VOICE_AGENT_ENV_KEYS = [
  "LIVEKIT_URL",
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "CARTESIA_API_KEY",
] as const;

function normalizeEnvValue(value?: string | null) {
  return (value || "").trim();
}

export function isProductionVoiceAgentRuntime(env: NodeJS.ProcessEnv = process.env) {
  return normalizeEnvValue(env.NODE_ENV) === "production";
}

export function resolveWorkerHttpHost(env: NodeJS.ProcessEnv = process.env) {
  return normalizeEnvValue(env.LIVEKIT_HTTP_HOST) || DEFAULT_WORKER_HTTP_HOST;
}

export function resolveWorkerHttpPort(env: NodeJS.ProcessEnv = process.env) {
  const rawPort = normalizeEnvValue(env.LIVEKIT_HTTP_PORT);
  const parsedPort = Number.parseInt(rawPort, 10);
  return Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : DEFAULT_WORKER_HTTP_PORT;
}

export function getVoiceAgentAppBaseUrl(env: NodeJS.ProcessEnv = process.env) {
  const explicitUrl = normalizeEnvValue(env.NEXT_PUBLIC_APP_URL) || normalizeEnvValue(env.APP_URL);
  if (explicitUrl) {
    return explicitUrl;
  }

  if (isProductionVoiceAgentRuntime(env)) {
    throw new Error("Missing required production voice agent app URL. Set NEXT_PUBLIC_APP_URL or APP_URL.");
  }

  return DEFAULT_LOCAL_APP_URL;
}

export function getVoiceAgentWebhookSecret(env: NodeJS.ProcessEnv = process.env) {
  const explicitSecret = normalizeEnvValue(env.VOICE_AGENT_WEBHOOK_SECRET) || normalizeEnvValue(env.LIVEKIT_API_SECRET);
  if (explicitSecret) {
    return explicitSecret;
  }

  if (isProductionVoiceAgentRuntime(env)) {
    throw new Error("Missing required production VOICE_AGENT_WEBHOOK_SECRET or LIVEKIT_API_SECRET.");
  }

  return "";
}

export function assertRequiredVoiceAgentEnv(env: NodeJS.ProcessEnv = process.env) {
  if (!isProductionVoiceAgentRuntime(env)) {
    return;
  }

  const missingKeys = REQUIRED_PRODUCTION_VOICE_AGENT_ENV_KEYS.filter((key) => !normalizeEnvValue(env[key]));
  if (!normalizeEnvValue(env.NEXT_PUBLIC_APP_URL) && !normalizeEnvValue(env.APP_URL)) {
    missingKeys.push("NEXT_PUBLIC_APP_URL|APP_URL" as never);
  }

  if (missingKeys.length > 0) {
    throw new Error(`Missing required production voice agent env: ${missingKeys.join(", ")}`);
  }
}
