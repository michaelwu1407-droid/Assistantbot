import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { buildVoiceAgentRuntimeFingerprint } from "@/livekit-agent/runtime-fingerprint";
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

function maxStatus(left: RuntimeStatus, right: RuntimeStatus): RuntimeStatus {
  const order: RuntimeStatus[] = ["healthy", "degraded", "unhealthy"];
  return order[Math.max(order.indexOf(left), order.indexOf(right))];
}

export function getExpectedVoiceAgentRuntimeFingerprint(env: NodeJS.ProcessEnv = process.env) {
  return buildVoiceAgentRuntimeFingerprint(env);
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
