import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type RuntimeStatus = "healthy" | "degraded" | "unhealthy";

export type VoiceAgentRuntimeDrift = {
  status: RuntimeStatus;
  summary: string;
  warnings: string[];
  expectedFingerprint: string;
  latestHeartbeat: {
    createdAt: string;
    deployGitSha: string | null;
    runtimeFingerprint: string | null;
    pid: number | null;
    summary: Record<string, unknown> | null;
  } | null;
};

const VOICE_AGENT_ENV_KEYS = [
  "LIVEKIT_URL",
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "APP_URL",
  "VOICE_AGENT_WEBHOOK_SECRET",
  "EARLYMARK_INBOUND_PHONE_NUMBERS",
  "EARLYMARK_INBOUND_PHONE_NUMBER",
  "EARLYMARK_PHONE_NUMBER",
  "TWILIO_PHONE_NUMBER",
  "DEEPGRAM_API_KEY",
  "DEEPINFRA_API_KEY",
  "GROQ_API_KEY",
  "CARTESIA_API_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "EARLYMARK_VOICE_LLM_PROVIDER",
  "EARLYMARK_VOICE_LLM_MODEL",
  "EARLYMARK_VOICE_LLM_TEMPERATURE",
  "EARLYMARK_VOICE_LLM_MAX_COMPLETION_TOKENS",
  "INBOUND_VOICE_LLM_MAX_COMPLETION_TOKENS",
  "INBOUND_VOICE_MIN_INTERRUPTION_WORDS",
  "VOICE_LLM_PROVIDER",
  "VOICE_LLM_MODEL",
  "VOICE_LLM_TEMPERATURE",
  "VOICE_LLM_MAX_COMPLETION_TOKENS",
  "VOICE_STT_MODEL",
  "VOICE_STT_LANGUAGE",
  "VOICE_STT_ENDPOINTING_MS",
  "VOICE_TTS_VOICE_ID",
  "VOICE_TTS_LANGUAGE",
  "VOICE_TTS_CHUNK_TIMEOUT_MS",
  "VOICE_MIN_CONSECUTIVE_SPEECH_DELAY_MS",
  "VOICE_MIN_ENDPOINTING_DELAY_MS",
  "VOICE_MAX_ENDPOINTING_DELAY_MS",
  "VOICE_MIN_INTERRUPTION_DURATION_MS",
  "VOICE_MIN_INTERRUPTION_WORDS",
  "VOICE_LATENCY_ENABLED",
  "VOICE_LATENCY_TARGET_CALL_TYPES",
  "VOICE_OPENER_BANK_ENABLED",
  "VOICE_OPENER_CONFIDENCE_THRESHOLD",
  "VOICE_GUARD_ENABLED",
  "VOICE_GUARD_PROVIDER",
  "VOICE_GUARD_MODEL",
  "VOICE_GUARD_BASE_URL",
  "VOICE_GUARD_TIMEOUT_MS",
  "VOICE_GUARD_MAX_COMPLETION_TOKENS",
  "VOICE_GUARD_TEMPERATURE",
  "VOICE_GUARD_MIN_CHARS",
  "VOICE_EMPATHY_TURN_GAP",
];

function normalizeEnvValue(value?: string) {
  return (value || "").trim();
}

function buildFingerprintSource(env: NodeJS.ProcessEnv = process.env) {
  return Object.fromEntries(
    VOICE_AGENT_ENV_KEYS.map((key) => [key, normalizeEnvValue(env[key])]),
  );
}

export function getExpectedVoiceAgentRuntimeFingerprint(env: NodeJS.ProcessEnv = process.env) {
  const source = buildFingerprintSource(env);
  const serialized = JSON.stringify(
    Object.keys(source)
      .sort()
      .map((key) => [key, source[key]]),
  );

  let hash = 5381;
  for (let index = 0; index < serialized.length; index += 1) {
    hash = ((hash << 5) + hash) ^ serialized.charCodeAt(index);
  }
  return `va_${(hash >>> 0).toString(16)}`;
}

function isJsonObject(value: Prisma.JsonValue | null | undefined): value is Prisma.JsonObject {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function readSummary(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export async function getLatestVoiceAgentHeartbeatEvent() {
  return db.webhookEvent.findFirst({
    where: { provider: "livekit_worker_status" },
    orderBy: { createdAt: "desc" },
  });
}

export async function getVoiceAgentRuntimeDrift(): Promise<VoiceAgentRuntimeDrift> {
  const expectedFingerprint = getExpectedVoiceAgentRuntimeFingerprint();
  const latest = await getLatestVoiceAgentHeartbeatEvent();
  const warnings: string[] = [];

  if (!latest || !isJsonObject(latest.payload)) {
    return {
      status: "unhealthy",
      summary: "No LiveKit worker heartbeat has been recorded",
      warnings: ["The voice worker has not reported its active runtime fingerprint to the app."],
      expectedFingerprint,
      latestHeartbeat: null,
    };
  }

  const payload = latest.payload;
  const runtimeFingerprint = readString(payload.runtimeFingerprint);
  const deployGitSha = readString(payload.deployGitSha);
  const pid = readNumber(payload.pid);
  const summary = readSummary(payload.summary);
  const ageMs = Date.now() - latest.createdAt.getTime();

  if (!runtimeFingerprint) {
    warnings.push("Latest worker heartbeat is missing a runtime fingerprint.");
  } else if (runtimeFingerprint !== expectedFingerprint) {
    warnings.push("LiveKit worker runtime fingerprint does not match the app's expected production env.");
  }

  if (ageMs > 15 * 60 * 1000) {
    warnings.push(`LiveKit worker heartbeat is stale (${Math.round(ageMs / 60000)} minutes old).`);
  }

  const status: RuntimeStatus =
    warnings.length === 0
      ? "healthy"
      : warnings.some((warning) => warning.includes("does not match") || warning.includes("missing"))
        ? "unhealthy"
        : "degraded";

  return {
    status,
    summary: warnings[0] || "LiveKit worker runtime matches expected configuration",
    warnings,
    expectedFingerprint,
    latestHeartbeat: {
      createdAt: latest.createdAt.toISOString(),
      deployGitSha,
      runtimeFingerprint,
      pid,
      summary,
    },
  };
}
