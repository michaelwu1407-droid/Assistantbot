import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  getVoiceFleetHealth,
  getLatestVoiceWorkerSnapshots,
  type RuntimeStatus,
  type VoiceWorkerSnapshot,
} from "@/lib/voice-fleet";

type LatestVoiceHeartbeatRecord = Awaited<ReturnType<typeof db.voiceWorkerHeartbeat.findFirst>>;
type LatestLegacyHeartbeatRecord = Awaited<ReturnType<typeof db.webhookEvent.findFirst>>;

export type VoiceAgentRuntimeDrift = {
  status: RuntimeStatus;
  summary: string;
  warnings: string[];
  expectedFingerprint: string;
  latestHeartbeat: {
    createdAt: string;
    hostId: string | null;
    workerRole: string | null;
    surfaceSet: string[];
    deployGitSha: string | null;
    runtimeFingerprint: string | null;
    pid: number | null;
    summary: Record<string, unknown> | null;
  } | null;
};

// Keep this list and fingerprint algorithm in sync with livekit-agent/agent.ts.
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
  "EARLYMARK_VOICE_FALLBACK_LLM_MODEL",
  "EARLYMARK_VOICE_LLM_TEMPERATURE",
  "EARLYMARK_VOICE_LLM_MAX_COMPLETION_TOKENS",
  "EARLYMARK_VOICE_STT_ENDPOINTING_MS",
  "EARLYMARK_VOICE_MIN_CONSECUTIVE_SPEECH_DELAY_MS",
  "EARLYMARK_VOICE_MIN_ENDPOINTING_DELAY_MS",
  "EARLYMARK_VOICE_MAX_ENDPOINTING_DELAY_MS",
  "EARLYMARK_VOICE_MIN_INTERRUPTION_DURATION_MS",
  "EARLYMARK_VOICE_MIN_INTERRUPTION_WORDS",
  "INBOUND_VOICE_LLM_MAX_COMPLETION_TOKENS",
  "INBOUND_VOICE_STT_ENDPOINTING_MS",
  "INBOUND_VOICE_MIN_INTERRUPTION_WORDS",
  "VOICE_LLM_PROVIDER",
  "VOICE_LLM_MODEL",
  "VOICE_FALLBACK_LLM_MODEL",
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
  "VOICE_MAX_ACTIVE_CALLS",
  "VOICE_MAX_ACTIVE_CALLS_SALES",
  "VOICE_MAX_ACTIVE_CALLS_CUSTOMER",
  "VOICE_HOST_ID",
  "VOICE_WORKER_ROLE",
  "VOICE_WORKER_SURFACES",
];

function normalizeEnvValue(value?: string) {
  return (value || "").trim();
}

function maxStatus(left: RuntimeStatus, right: RuntimeStatus): RuntimeStatus {
  const order: RuntimeStatus[] = ["healthy", "degraded", "unhealthy"];
  return order[Math.max(order.indexOf(left), order.indexOf(right))];
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

function buildWorkerScopedEnv(worker: Pick<VoiceWorkerSnapshot, "hostId" | "workerRole" | "surfaceSet">, env: NodeJS.ProcessEnv = process.env) {
  return {
    ...env,
    VOICE_HOST_ID: worker.hostId,
    VOICE_WORKER_ROLE: worker.workerRole,
    VOICE_WORKER_SURFACES: worker.surfaceSet.join(","),
  } as NodeJS.ProcessEnv;
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

function isLegacyHeartbeatRecord(
  value: NonNullable<LatestVoiceHeartbeatRecord | LatestLegacyHeartbeatRecord>,
): value is NonNullable<LatestLegacyHeartbeatRecord> {
  return "payload" in value;
}

export async function getLatestVoiceAgentHeartbeatEvent() {
  const latestHeartbeat = await db.voiceWorkerHeartbeat.findFirst({
    orderBy: [{ heartbeatAt: "desc" }, { createdAt: "desc" }],
  });

  if (latestHeartbeat) {
    return latestHeartbeat;
  }

  return db.webhookEvent.findFirst({
    where: { provider: "livekit_worker_status" },
    orderBy: { createdAt: "desc" },
  });
}

export async function getVoiceAgentRuntimeDrift(): Promise<VoiceAgentRuntimeDrift> {
  const [latest, workerSnapshots, fleet] = await Promise.all([
    getLatestVoiceAgentHeartbeatEvent(),
    getLatestVoiceWorkerSnapshots(),
    getVoiceFleetHealth(),
  ]);
  const latestSnapshot = workerSnapshots
    .slice()
    .sort((left, right) => right.heartbeatAt.localeCompare(left.heartbeatAt))[0] || null;
  const expectedFingerprint = latestSnapshot
    ? getExpectedVoiceAgentRuntimeFingerprint(buildWorkerScopedEnv(latestSnapshot))
    : getExpectedVoiceAgentRuntimeFingerprint();
  const warnings: string[] = [];

  if (!latest) {
    return {
      status: "unhealthy",
      summary: "No voice worker heartbeat has been recorded",
      warnings: ["The voice worker fleet has not reported an active runtime fingerprint to the app."],
      expectedFingerprint,
      latestHeartbeat: null,
    };
  }

  if (isLegacyHeartbeatRecord(latest) && !isJsonObject(latest.payload)) {
    return {
      status: "unhealthy",
      summary: "Latest legacy heartbeat payload is invalid",
      warnings: ["The latest heartbeat exists but does not contain a usable runtime fingerprint payload."],
      expectedFingerprint,
      latestHeartbeat: null,
    };
  }

  const runtimeFingerprint = latestSnapshot?.runtimeFingerprint || (isLegacyHeartbeatRecord(latest) && isJsonObject(latest.payload)
    ? readString(latest.payload.runtimeFingerprint)
    : null);
  const fingerprintMismatches = workerSnapshots.filter((worker) => {
    const scopedExpectedFingerprint = getExpectedVoiceAgentRuntimeFingerprint(buildWorkerScopedEnv(worker));
    return worker.runtimeFingerprint !== scopedExpectedFingerprint;
  });

  if (!runtimeFingerprint) {
    warnings.push("Latest worker heartbeat is missing a runtime fingerprint.");
  } else if (fingerprintMismatches.length > 0) {
    warnings.push("LiveKit worker runtime fingerprint does not match the app's expected production env.");
  }

  warnings.push(...fleet.warnings);
  const dedupedWarnings = Array.from(new Set(warnings.filter(Boolean)));

  const fingerprintStatus: RuntimeStatus =
    !runtimeFingerprint
      ? "unhealthy"
      : fingerprintMismatches.length > 0
        ? "degraded"
        : "healthy";
  const status = maxStatus(fleet.status, fingerprintStatus);

  if (isLegacyHeartbeatRecord(latest) && isJsonObject(latest.payload)) {
    const payload = latest.payload;
    return {
      status,
      summary: dedupedWarnings[0] || fleet.summary,
      warnings: dedupedWarnings,
      expectedFingerprint,
      latestHeartbeat: {
        createdAt: latest.createdAt.toISOString(),
        hostId: null,
        workerRole: null,
        surfaceSet: [],
        deployGitSha: readString(payload.deployGitSha),
        runtimeFingerprint,
        pid: readNumber(payload.pid),
        summary: readSummary(payload.summary),
      },
    };
  }

  const workerHeartbeat = latest as NonNullable<LatestVoiceHeartbeatRecord>;

  return {
    status,
    summary: dedupedWarnings[0] || fleet.summary,
    warnings: dedupedWarnings,
    expectedFingerprint,
    latestHeartbeat: {
      createdAt: workerHeartbeat.heartbeatAt.toISOString(),
      hostId: workerHeartbeat.hostId,
      workerRole: workerHeartbeat.workerRole,
      surfaceSet: Array.isArray(workerHeartbeat.surfaceSet)
        ? workerHeartbeat.surfaceSet.filter((value: unknown): value is string => typeof value === "string")
        : [],
      deployGitSha: workerHeartbeat.deployGitSha,
      runtimeFingerprint,
      pid: null,
      summary: readSummary(workerHeartbeat.summary),
    },
  };
}
